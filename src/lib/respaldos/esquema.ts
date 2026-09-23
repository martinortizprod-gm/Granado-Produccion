import { createAdminClient } from "@/lib/supabase/admin";
import type { TablaEsquema, TablaRespaldo } from "@/lib/respaldos/tipos";

const IDENT = /^[a-z_][a-z0-9_]*$/i;

function esquemas(spec: Record<string, unknown>) {
  const components = spec.components as { schemas?: Record<string, unknown> } | undefined;
  const definitions = spec.definitions as Record<string, unknown> | undefined;
  return components?.schemas ?? definitions ?? {};
}

function esColumna(def: unknown) {
  if (!def || typeof def !== "object") return false;
  const tipo = (def as { type?: string }).type;
  return tipo !== "object" && tipo !== "array";
}

function columnasDe(schema: unknown) {
  if (!schema || typeof schema !== "object") return [];
  const props = (schema as { properties?: Record<string, unknown> }).properties ?? {};
  const columnas: { nombre: string; pk: boolean }[] = [];
  for (const [nombre, def] of Object.entries(props)) {
    if (!IDENT.test(nombre) || !esColumna(def)) continue;
    const desc = String((def as { description?: string }).description ?? "");
    columnas.push({
      nombre,
      pk: desc.includes("Primary Key") || desc.includes("<pk/>"),
    });
  }
  return columnas;
}

const RESERVADOS = new Set([
  "select",
  "order",
  "offset",
  "limit",
  "and",
  "or",
  "not",
  "on_conflict",
  "columns",
  "prefer",
  "range",
]);

function nombreDePath(path: string) {
  if (!path.startsWith("/")) return null;
  const nombre = path.slice(1);
  if (!nombre || nombre.includes("/") || nombre.startsWith("rpc")) return null;
  if (!IDENT.test(nombre)) return null;
  return nombre;
}

function resolver(spec: Record<string, unknown>, ref: string) {
  if (!ref.startsWith("#/")) return null;
  let actual: unknown = spec;
  for (const parte of ref.slice(2).split("/")) {
    if (!actual || typeof actual !== "object") return null;
    actual = (actual as Record<string, unknown>)[decodeURIComponent(parte)];
  }
  return actual;
}

function schemaDelPath(spec: Record<string, unknown>, pathItem: unknown, nombre: string) {
  const todos = esquemas(spec);
  const directo = todos[nombre] ?? todos[`public.${nombre}`];
  if (directo) return directo;
  const get = (pathItem as { get?: { responses?: Record<string, unknown> } } | null)?.get;
  const respuesta = get?.responses?.["200"];
  if (!respuesta || typeof respuesta !== "object") return null;
  const content = (respuesta as { content?: Record<string, { schema?: { items?: { $ref?: string }; $ref?: string } }> }).content;
  const schema =
    content?.["application/json"]?.schema ??
    (respuesta as { schema?: { items?: { $ref?: string }; $ref?: string } }).schema;
  const ref = schema?.items?.$ref ?? schema?.$ref;
  return typeof ref === "string" ? resolver(spec, ref) : null;
}

function columnasDeParametros(pathItem: unknown) {
  const params =
    (pathItem as { get?: { parameters?: { name?: string; in?: string; $ref?: string }[] } } | null)?.get
      ?.parameters ?? [];
  const columnas: string[] = [];
  for (const param of params) {
    if (param.$ref || param.in !== "query" || !param.name) continue;
    if (RESERVADOS.has(param.name) || !IDENT.test(param.name)) continue;
    columnas.push(param.name);
  }
  return columnas;
}

async function definiciones(): Promise<TablaEsquema[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Falta la configuración de Supabase para leer el esquema.");
  }

  const headersBase = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/`, {
      headers: { ...headersBase, Accept: "application/openapi+json" },
      cache: "no-store",
    });
    if (res.status === 406) {
      res = await fetch(`${url}/rest/v1/`, {
        headers: { ...headersBase, Accept: "application/json" },
        cache: "no-store",
      });
    }
  } catch {
    throw new Error("No se pudo consultar el esquema de la base.");
  }
  if (!res.ok) {
    throw new Error(`No se pudo consultar el esquema de la base (${res.status}).`);
  }

  let spec: Record<string, unknown>;
  try {
    spec = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error("La base no devolvió el esquema en un formato reconocible.");
  }

  const paths = (spec.paths ?? {}) as Record<string, unknown>;
  const tablas: TablaEsquema[] = [];

  for (const path of Object.keys(paths)) {
    const nombre = nombreDePath(path);
    if (!nombre) continue;
    const schema = schemaDelPath(spec, paths[path], nombre);
    const detalle = columnasDe(schema);
    const columnas = detalle.length
      ? detalle.map((c) => c.nombre)
      : columnasDeParametros(paths[path]);
    if (!columnas.length) continue;
    const pk = detalle.find((c) => c.pk);
    const orden =
      pk?.nombre ?? (columnas.includes("id") ? "id" : columnas[0]);
    tablas.push({ nombre, columnas, orden });
  }

  tablas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return tablas;
}

async function contarFilas(nombres: string[]) {
  const admin = createAdminClient();
  const salida = new Map<string, number | null>();
  const lote = 8;
  for (let i = 0; i < nombres.length; i += lote) {
    const grupo = nombres.slice(i, i + lote);
    const res = await Promise.all(
      grupo.map(async (nombre) => {
        const { count, error } = await admin
          .from(nombre)
          .select("*", { count: "exact", head: true });
        return [nombre, error ? null : (count ?? 0)] as const;
      }),
    );
    for (const [nombre, filas] of res) salida.set(nombre, filas);
  }
  return salida;
}

export async function listarEsquema(): Promise<TablaRespaldo[]> {
  const defs = await definiciones();
  const conteos = await contarFilas(defs.map((t) => t.nombre));
  return defs.map((t) => ({
    nombre: t.nombre,
    columnas: t.columnas,
    filas: conteos.get(t.nombre) ?? null,
  }));
}

const LOTE = 1000;
const MAX_FILAS = 500_000;

export async function leerTablas(pedido: { nombre: string; columnas: string[] }[]) {
  const defs = await definiciones();
  const porNombre = new Map(defs.map((t) => [t.nombre, t]));
  const admin = createAdminClient();
  const salida: {
    nombre: string;
    columnas: string[];
    filas: Record<string, unknown>[];
  }[] = [];

  for (const item of pedido) {
    if (!item || typeof item.nombre !== "string" || !Array.isArray(item.columnas)) {
      throw new Error("La selección de tablas no es válida.");
    }
    const tabla = porNombre.get(item.nombre);
    if (!tabla) throw new Error(`La tabla ${item.nombre} no está en la base.`);
    const permitidas = new Set(tabla.columnas);
    const vistas = new Set<string>();
    const columnas: string[] = [];
    for (const col of item.columnas) {
      if (typeof col !== "string" || !permitidas.has(col) || vistas.has(col)) continue;
      vistas.add(col);
      columnas.push(col);
    }
    if (!columnas.length) continue;

    const filas: Record<string, unknown>[] = [];
    let cortada = false;
    while (filas.length < MAX_FILAS) {
      const { data, error } = await admin
        .from(tabla.nombre)
        .select(columnas.join(","))
        .order(tabla.orden, { ascending: true })
        .range(filas.length, filas.length + LOTE - 1);
      if (error) throw new Error(`${tabla.nombre}: ${error.message}`);
      const lote = (data ?? []) as unknown as Record<string, unknown>[];
      filas.push(...lote);
      if (lote.length < LOTE) {
        cortada = false;
        break;
      }
      cortada = true;
    }
    if (cortada && filas.length >= MAX_FILAS) {
      throw new Error(
        `${tabla.nombre} supera las ${MAX_FILAS.toLocaleString("es-AR")} filas.`,
      );
    }
    salida.push({ nombre: tabla.nombre, columnas, filas });
  }

  if (!salida.length) throw new Error("No hay columnas seleccionadas para exportar.");
  return salida;
}
