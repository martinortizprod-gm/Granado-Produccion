import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ProductoOpcion,
  SolicitudVista,
  VersionOpcion,
  enriquecerSolicitud,
  idEntero,
  numero,
  ordenarSolicitudes,
  texto,
} from "@/lib/solicitudes/logic";

function mapaId(
  filas: Record<string, unknown>[] | null,
): Map<number, Record<string, unknown>> {
  const m = new Map<number, Record<string, unknown>>();
  for (const f of filas || []) {
    const id = idEntero(f.id);
    if (id != null) m.set(id, f);
  }
  return m;
}

export async function cargarDatosSolicitudes(): Promise<{
  solicitudes: SolicitudVista[];
  productos: ProductoOpcion[];
  error: string | null;
}> {
  const supabase = await createClient();

  const [
    solRes,
    prodRes,
    catRes,
    verRes,
    envRes,
    etiRes,
  ] = await Promise.all([
    supabase.from("solicitudes").select("*"),
    supabase.from("produccion").select("id_solicitud, pallets, unidades, peso_kg"),
    supabase.from("catalogo_productos").select("*"),
    supabase.from("registro_versiones").select("*"),
    supabase.from("catalogo_envases").select("*"),
    supabase.from("catalogo_etiquetas").select("*"),
  ]);

  const err =
    solRes.error?.message ||
    prodRes.error?.message ||
    catRes.error?.message ||
    verRes.error?.message ||
    envRes.error?.message ||
    etiRes.error?.message ||
    null;

  if (err) {
    return { solicitudes: [], productos: [], error: err };
  }

  const porSolicitud = new Map<
    number,
    { pallets: number; unidades: number; kg: number }
  >();
  for (const fila of prodRes.data || []) {
    const idSol = idEntero(fila.id_solicitud);
    if (idSol == null) continue;
    const b = porSolicitud.get(idSol) || { pallets: 0, unidades: 0, kg: 0 };
    b.pallets += numero(fila.pallets);
    b.unidades += numero(fila.unidades);
    b.kg += numero(fila.peso_kg);
    porSolicitud.set(idSol, b);
  }

  const mapaProductos = mapaId(catRes.data as Record<string, unknown>[]);
  const mapaVersiones = mapaId(verRes.data as Record<string, unknown>[]);
  const mapaEnvases = mapaId(envRes.data as Record<string, unknown>[]);
  const mapaEtiquetas = mapaId(etiRes.data as Record<string, unknown>[]);

  const filas = (solRes.data || []).filter(
    (f) => idEntero(f.id) != null || texto(f.lote) !== "",
  );

  const solicitudes = ordenarSolicitudes(
    filas.map((fila) =>
      enriquecerSolicitud(
        fila as Record<string, unknown>,
        porSolicitud,
        mapaProductos,
        mapaVersiones,
        mapaEnvases,
        mapaEtiquetas,
      ),
    ),
  );

  const versionesPorProducto = new Map<number, VersionOpcion[]>();
  for (const fila of verRes.data || []) {
    const idProducto = idEntero(fila.id_producto);
    const idVersion = idEntero(fila.id);
    const nro = idEntero(fila.version);
    if (idProducto == null || idVersion == null) continue;
    const list = versionesPorProducto.get(idProducto) || [];
    list.push({
      id: idVersion,
      numero: nro ?? 0,
      estado: texto(fila.estado),
    });
    versionesPorProducto.set(idProducto, list);
  }

  const productos: ProductoOpcion[] = [];
  for (const fila of catRes.data || []) {
    const nombre = texto(fila.producto);
    if (!nombre) continue;
    const id = idEntero(fila.id);
    if (id == null) continue;
    const idEnvase = idEntero(fila.id_envase);
    const idEtiqueta = idEntero(fila.id_etiqueta);
    const envase = idEnvase != null ? mapaEnvases.get(idEnvase) || {} : {};
    const etiqueta = idEtiqueta != null ? mapaEtiquetas.get(idEtiqueta) || {} : {};
    const recetaRaw = fila.receta_PLC;
    const recetaN = idEntero(recetaRaw);
    productos.push({
      id,
      codigo: texto(fila.codigo),
      nombre,
      versiones: (versionesPorProducto.get(id) || []).sort(
        (a, b) => a.numero - b.numero,
      ),
      receta_plc: recetaN != null ? String(recetaN) : texto(recetaRaw),
      id_envase: idEnvase,
      codigo_envase: texto(envase.codigo),
      envase: texto(envase.envase),
      capacidad_kg: numero(envase.capacidad_carga_kg),
      id_etiqueta: idEtiqueta,
      codigo_etiqueta: texto(etiqueta.codigo),
      nombre_etiqueta: texto(etiqueta.etiqueta),
      categoria: texto(fila.categoria),
    });
  }
  productos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return { solicitudes, productos, error: null };
}

export async function siguienteIdSolicitud(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("solicitudes")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id ?? 0) + 1;
}
