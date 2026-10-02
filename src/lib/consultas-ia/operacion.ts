import { fmtHs, fmtKg, resumenAnalytics, armarJornadas, armarPlan } from "@/lib/analytics/logic";
import { CATALOGOS, calcularStock, type KindCatalogo } from "@/lib/catalogos/logic";
import { calcularStockProductos } from "@/lib/productos/logic";
import { nroDec } from "@/lib/produccion/logic";
import {
  aFecha,
  clave,
  enriquecerSolicitud,
  fechaVisible,
  filtrarSolicitudes,
  idEntero,
  numero,
  texto,
} from "@/lib/solicitudes/logic";
import type { cargarConsultaIa } from "@/lib/consultas-ia/datos";

export type DatosConsulta = Awaited<ReturnType<typeof cargarConsultaIa>>;

export type BarraIa = { etiqueta: string; valor: number };

export type TablaIa = {
  resumen: string;
  fuente: string;
  columnas: string[];
  filas: string[][];
  barras?: BarraIa[];
};

const MAX = 40;
const FAMILIAS = ["ingredientes", "insumos", "envases", "etiquetas", "productos", "todas"] as const;
type Familia = (typeof FAMILIAS)[number];

const MOV: Record<Exclude<Familia, "todas">, { filas: keyof DatosConsulta; id: string; cantidad: string; unidad: string }> = {
  ingredientes: { filas: "movIng", id: "id_ingrediente", cantidad: "peso_total", unidad: "kg" },
  insumos: { filas: "movIns", id: "id_insumo", cantidad: "cantidad", unidad: "Un." },
  envases: { filas: "movEnv", id: "id_envase", cantidad: "cantidad", unidad: "Un." },
  etiquetas: { filas: "movEti", id: "id_etiqueta", cantidad: "cantidad", unidad: "Un." },
  productos: { filas: "movProd", id: "id_producto", cantidad: "stk_kg", unidad: "kg" },
};

const CATALOGO: Record<KindCatalogo, keyof DatosConsulta> = {
  ingredientes: "ingredientes",
  insumos: "insumos",
  envases: "envases",
  etiquetas: "etiquetas",
};

export function esOperacion(nombre: string) {
  return (
    nombre === "stock_articulos" ||
    nombre === "movimientos_articulos" ||
    nombre === "consumos_articulos" ||
    nombre === "produccion_resumen" ||
    nombre === "planificacion" ||
    nombre === "tiempos_produccion" ||
    nombre === "causas_paradas" ||
    nombre === "solicitudes" ||
    nombre === "produccion_pendiente"
  );
}

function lista(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const out: string[] = [];
  for (const item of valor) {
    const nombre = typeof item === "string" ? item.trim() : "";
    if (!nombre || nombre.length > 120) continue;
    if (!out.some((existente) => clave(existente) === clave(nombre))) out.push(nombre);
    if (out.length >= 8) break;
  }
  return out;
}

function familiaDe(valor: unknown): Familia | null {
  const t = clave(valor);
  if (!t || t === "todas" || t === "todos") return "todas";
  if (t.startsWith("ingred")) return "ingredientes";
  if (t.startsWith("insumo")) return "insumos";
  if (t.startsWith("envase")) return "envases";
  if (t.startsWith("etiquet")) return "etiquetas";
  if (t.startsWith("product")) return "productos";
  return null;
}

function agruparDe(valor: unknown): "total" | "producto" | "lote" | "categoria" | "dia" | "presentacion" {
  const t = clave(valor);
  if (t.startsWith("present") || t.startsWith("envase")) return "presentacion";
  if (t.startsWith("product")) return "producto";
  if (t.startsWith("lote")) return "lote";
  if (t.startsWith("categ")) return "categoria";
  if (t === "dia" || t === "fecha") return "dia";
  return "total";
}

function coincide(pedido: string[], nombre: string, codigo = ""): boolean {
  if (!pedido.length) return true;
  return pedido.some((item) => {
    const p = clave(item);
    if (!p) return false;
    if (p === clave(nombre) || (codigo && p === clave(codigo))) return true;
    return p.length >= 3 && (clave(nombre).includes(p) || clave(codigo).includes(p));
  });
}

function hastaFecha(filas: Record<string, unknown>[], hasta: string) {
  return filas.filter((fila) => {
    const fecha = aFecha(fila.fecha_registro);
    return fecha != null && fecha <= hasta;
  });
}

function cortar(filas: string[][]): { filas: string[][]; nota: string } {
  if (filas.length <= MAX) return { filas, nota: "" };
  return {
    filas: filas.slice(0, MAX),
    nota: ` Se muestran ${MAX} de ${filas.length} filas.`,
  };
}

function nro(valor: number) {
  return nroDec(valor, 3);
}

function catalogoDe(datos: DatosConsulta, familia: KindCatalogo) {
  return datos[CATALOGO[familia]] as Record<string, unknown>[];
}

function nombreItem(fila: Record<string, unknown>, familia: KindCatalogo) {
  return texto(fila[CATALOGOS[familia].campoNombre]);
}

function stockCatalogo(
  datos: DatosConsulta,
  familia: KindCatalogo,
  hasta: string,
  nombres: string[],
): string[][] {
  const cfg = CATALOGOS[familia];
  const catalogo = catalogoDe(datos, familia);
  const movs = hastaFecha(datos[MOV[familia].filas] as Record<string, unknown>[], hasta);
  const stocks = calcularStock(cfg, catalogo, movs, datos.articulos, hastaFecha(datos.consumos, hasta));
  const filas: { nombre: string; celdas: string[]; stock: number }[] = [];
  for (const item of catalogo) {
    const id = idEntero(item.id);
    if (id == null) continue;
    const nombre = nombreItem(item, familia);
    const codigo = texto(item.codigo);
    if (!coincide(nombres, nombre, codigo)) continue;
    const saldo = stocks.get(id) ?? { ingresos: 0, egresos: 0, produccion: 0, stock: 0 };
    if (!nombres.length && saldo.ingresos === 0 && saldo.egresos === 0 && saldo.produccion === 0) continue;
    filas.push({
      nombre,
      stock: saldo.stock,
      celdas: [
        familia,
        codigo || "—",
        nombre || "—",
        nro(saldo.ingresos),
        nro(saldo.egresos),
        nro(saldo.produccion),
        nro(saldo.stock),
        cfg.unidad,
      ],
    });
  }
  filas.sort((a, b) => Math.abs(b.stock) - Math.abs(a.stock) || a.nombre.localeCompare(b.nombre, "es"));
  return filas.map((fila) => fila.celdas);
}

function stockProductos(datos: DatosConsulta, hasta: string, nombres: string[]): string[][] {
  const saldos = calcularStockProductos(
    hastaFecha(datos.movProd, hasta),
    hastaFecha(datos.producciones, hasta),
    datos.solicitudes,
  );
  const filas: { nombre: string; kg: number; celdas: string[] }[] = [];
  for (const item of datos.productos) {
    const id = idEntero(item.id);
    if (id == null) continue;
    const nombre = texto(item.producto);
    const codigo = texto(item.codigo);
    if (!coincide(nombres, nombre, codigo)) continue;
    const saldo = saldos.get(id);
    const kg = saldo?.stk_kg ?? 0;
    const pall = saldo?.stk_pall ?? 0;
    const un = saldo?.stk_un ?? 0;
    if (!nombres.length && kg === 0 && pall === 0 && un === 0) continue;
    filas.push({
      nombre,
      kg,
      celdas: ["productos", codigo || "—", nombre || "—", nro(pall), nro(un), nro(kg), "kg"],
    });
  }
  filas.sort((a, b) => Math.abs(b.kg) - Math.abs(a.kg) || a.nombre.localeCompare(b.nombre, "es"));
  return filas.map((fila) => fila.celdas);
}

function consultarStock(datos: DatosConsulta, args: Record<string, unknown>, hasta: string): TablaIa | { error: string } {
  const familia = familiaDe(args.familia);
  if (!familia) return { error: "No quedó clara la familia: ingredientes, insumos, envases, etiquetas o productos." };
  const nombres = lista(args.nombres);
  if (familia === "todas") {
    const resumidas = [
      ...stockCatalogo(datos, "ingredientes", hasta, nombres).map((fila) => [fila[0], fila[1], fila[2], fila[6], fila[7]]),
      ...stockCatalogo(datos, "insumos", hasta, nombres).map((fila) => [fila[0], fila[1], fila[2], fila[6], fila[7]]),
      ...stockCatalogo(datos, "envases", hasta, nombres).map((fila) => [fila[0], fila[1], fila[2], fila[6], fila[7]]),
      ...stockCatalogo(datos, "etiquetas", hasta, nombres).map((fila) => [fila[0], fila[1], fila[2], fila[6], fila[7]]),
      ...stockProductos(datos, hasta, nombres).map((fila) => [fila[0], fila[1], fila[2], fila[5], fila[6]]),
    ];
    const corte = cortar(resumidas);
    return {
      resumen: resumidas.length
        ? `Stock al ${fechaVisible(hasta)}: ${resumidas.length} artículos.${corte.nota}`
        : `No hay stock con movimientos hasta el ${fechaVisible(hasta)}.`,
      fuente:
        "Stock acumulado hasta esa fecha. En ingredientes, insumos, envases y etiquetas es ingresos menos egresos menos consumo. En productos es el saldo en kilos.",
      columnas: ["Familia", "Código", "Artículo", "Stock", "Unidad"],
      filas: corte.filas,
    };
  }
  const filas =
    familia === "productos" ? stockProductos(datos, hasta, nombres) : stockCatalogo(datos, familia, hasta, nombres);
  const corte = cortar(filas);
  return {
    resumen: filas.length
      ? `Stock al ${fechaVisible(hasta)}: ${filas.length} artículos con movimiento o saldo.${corte.nota}`
      : `No hay stock con movimientos hasta el ${fechaVisible(hasta)}.`,
    fuente:
      familia === "productos"
        ? "Saldo de productos hasta esa fecha: movimientos más jornadas que no están cerradas en un movimiento."
        : "Stock acumulado hasta esa fecha: ingresos menos egresos menos consumo de producción.",
    columnas:
      familia === "productos"
        ? ["Familia", "Código", "Artículo", "Pallets", "Unidades", "Kg", "Unidad"]
        : ["Familia", "Código", "Artículo", "Ingresos", "Egresos", "Consumo prod.", "Stock", "Unidad"],
    filas: corte.filas,
  };
}

function signoMov(tipo: unknown): "ingreso" | "egreso" | null {
  const n = clave(tipo);
  if (n === "ingreso" || n === "entrada") return "ingreso";
  if (n === "egreso" || n === "salida") return "egreso";
  return null;
}

function movimientosDe(datos: DatosConsulta, familia: Exclude<Familia, "todas">, desde: string, hasta: string, nombres: string[]) {
  const cfg = MOV[familia];
  const catalogo =
    familia === "productos" ? datos.productos : catalogoDe(datos, familia);
  const campoNombre = familia === "productos" ? "producto" : CATALOGOS[familia].campoNombre;
  const porId = new Map<number, { codigo: string; nombre: string }>();
  for (const item of catalogo) {
    const id = idEntero(item.id);
    if (id == null) continue;
    porId.set(id, { codigo: texto(item.codigo), nombre: texto(item[campoNombre]) });
  }
  const grupos = new Map<string, { codigo: string; nombre: string; ingresos: number; egresos: number; n: number }>();
  for (const fila of datos[cfg.filas] as Record<string, unknown>[]) {
    const fecha = aFecha(fila.fecha_registro);
    if (!fecha || fecha < desde || fecha > hasta) continue;
    const tipo = signoMov(fila.tipo);
    if (!tipo) continue;
    const id = idEntero(fila[cfg.id]);
    const ref = id != null ? porId.get(id) : undefined;
    const nombre = ref?.nombre || texto(fila[campoNombre]) || (id != null ? `${familia} ${id}` : "Sin artículo");
    const codigo = ref?.codigo || "";
    if (!coincide(nombres, nombre, codigo)) continue;
    const key = `${familia}:${id ?? clave(nombre)}`;
    const grupo = grupos.get(key) ?? { codigo, nombre, ingresos: 0, egresos: 0, n: 0 };
    const cantidad = numero(fila[cfg.cantidad]);
    if (tipo === "ingreso") grupo.ingresos += cantidad;
    else grupo.egresos += cantidad;
    grupo.n += 1;
    grupos.set(key, grupo);
  }
  return [...grupos.values()]
    .sort((a, b) => b.ingresos + b.egresos - (a.ingresos + a.egresos) || a.nombre.localeCompare(b.nombre, "es"))
    .map((grupo) => [
      familia,
      grupo.codigo || "—",
      grupo.nombre,
      nro(grupo.ingresos),
      nro(grupo.egresos),
      String(grupo.n),
      cfg.unidad,
    ]);
}

function consultarMovimientos(
  datos: DatosConsulta,
  args: Record<string, unknown>,
  desde: string,
  hasta: string,
): TablaIa | { error: string } {
  const familia = familiaDe(args.familia);
  if (!familia) return { error: "No quedó clara la familia del movimiento." };
  const nombres = lista(args.nombres);
  const familias = familia === "todas" ? (["ingredientes", "insumos", "envases", "etiquetas", "productos"] as const) : [familia];
  const filas = familias.flatMap((item) => movimientosDe(datos, item, desde, hasta, nombres));
  const corte = cortar(filas);
  return {
    resumen: filas.length
      ? `Movimientos del ${fechaVisible(desde)} al ${fechaVisible(hasta)}: ${filas.length} artículos.${corte.nota}`
      : `No hay movimientos entre el ${fechaVisible(desde)} y el ${fechaVisible(hasta)}.`,
    fuente: "Suma de ingresos y egresos del período. No es el stock.",
    columnas: ["Familia", "Código", "Artículo", "Ingresos", "Egresos", "Movimientos", "Unidad"],
    filas: corte.filas,
  };
}

function consultarConsumos(
  datos: DatosConsulta,
  args: Record<string, unknown>,
  desde: string,
  hasta: string,
): TablaIa | { error: string } {
  const familia = familiaDe(args.familia);
  if (!familia) return { error: "No quedó clara la familia del consumo." };
  const nombres = lista(args.nombres);
  const grupos = new Map<string, { familia: string; codigo: string; nombre: string; cantidad: number; n: number; unidad: string }>();

  if (familia !== "productos") {
    const artPorId = new Map<number, { familia: KindCatalogo; idOrigen: number }>();
    for (const art of datos.articulos) {
      const id = idEntero(art.id);
      const origen = idEntero(art.id_origen);
      const tipo = clave(art.tipo_articulo);
      const kind = (["ingredientes", "insumos", "envases", "etiquetas"] as const).find(
        (item) => CATALOGOS[item].tipoArticulo === tipo,
      );
      if (id == null || origen == null || !kind) continue;
      artPorId.set(id, { familia: kind, idOrigen: origen });
    }
    for (const fila of datos.consumos) {
      const fecha = aFecha(fila.fecha_registro);
      if (!fecha || fecha < desde || fecha > hasta) continue;
      const art = artPorId.get(idEntero(fila.id_articulo) ?? -1);
      if (!art) continue;
      if (familia !== "todas" && art.familia !== familia) continue;
      const catalogo = catalogoDe(datos, art.familia);
      const item = catalogo.find((row) => idEntero(row.id) === art.idOrigen);
      const nombre = item ? nombreItem(item, art.familia) : `Artículo ${art.idOrigen}`;
      const codigo = item ? texto(item.codigo) : "";
      if (!coincide(nombres, nombre, codigo)) continue;
      const key = `${art.familia}:${art.idOrigen}`;
      const grupo = grupos.get(key) ?? {
        familia: art.familia,
        codigo,
        nombre,
        cantidad: 0,
        n: 0,
        unidad: CATALOGOS[art.familia].unidad,
      };
      grupo.cantidad += numero(fila.cantidad);
      grupo.n += 1;
      grupos.set(key, grupo);
    }
  }

  if (familia === "productos" || familia === "todas") {
    const jornadas = jornadasDe(datos).filter((item) => item.fecha && item.fecha >= desde && item.fecha <= hasta);
    const porProducto = new Map<string, { cantidad: number; n: number }>();
    for (const jornada of jornadas) {
      if (!coincide(nombres, jornada.producto)) continue;
      const grupo = porProducto.get(jornada.producto) ?? { cantidad: 0, n: 0 };
      grupo.cantidad += jornada.kg;
      grupo.n += 1;
      porProducto.set(jornada.producto, grupo);
    }
    for (const [nombre, grupo] of porProducto) {
      if (grupo.cantidad === 0) continue;
      grupos.set(`productos:${clave(nombre)}`, {
        familia: "productos",
        codigo: "",
        nombre,
        cantidad: grupo.cantidad,
        n: grupo.n,
        unidad: "kg producidos",
      });
    }
  }

  const filas = [...grupos.values()]
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"))
    .map((grupo) => [
      grupo.familia,
      grupo.codigo || "—",
      grupo.nombre,
      nro(grupo.cantidad),
      grupo.unidad,
      String(grupo.n),
    ]);
  const corte = cortar(filas);
  return {
    resumen: filas.length
      ? `Consumo del ${fechaVisible(desde)} al ${fechaVisible(hasta)}: ${filas.length} artículos.${corte.nota}`
      : `No hay consumo entre el ${fechaVisible(desde)} y el ${fechaVisible(hasta)}.`,
    fuente:
      familia === "productos"
        ? "En productos se muestran los kilos elaborados en las jornadas, no un consumo de stock."
        : "Consumo registrado en las jornadas de producción (tabla consumo). No incluye egresos de stock.",
    columnas: ["Familia", "Código", "Artículo", "Cantidad", "Unidad", "Registros"],
    filas: corte.filas,
  };
}

function jornadasDe(datos: DatosConsulta) {
  return armarJornadas({
    producciones: datos.producciones,
    solicitudes: datos.solicitudes,
    productos: datos.productos,
    envases: datos.envases,
    causas: datos.causas,
    paradasProg: datos.paradasProg,
    paradasNo: datos.paradasNo,
  });
}

function plano(valor: string) {
  return clave(valor)
    .replace(/\*/g, " ")
    .replace(/\bbig\s*bags?\b/g, "bigbag")
    .replace(/\bbolsas?\b/g, "bolsa")
    .replace(/\bkg\b/g, " ")
    .replace(/\b(en|de|por|el|la|los|las)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensUtiles(valor: string) {
  return plano(valor).split(" ").filter((token) => token.length >= 2 || /^\d+$/.test(token));
}

function coincidePresentacion(pedidos: string[], producto: string, envase: string, categoria: string) {
  if (!pedidos.length) return true;
  const texto = plano(`${producto} ${envase} ${categoria}`);
  return pedidos.some((pedido) => {
    const tokens = tokensUtiles(pedido);
    return tokens.length > 0 && tokens.every((token) => texto.includes(token));
  });
}

function envaseVisible(datos: DatosConsulta, envase: string) {
  const fila = datos.envases.find((item) => clave(item.envase) === clave(envase));
  const capacidad = numero(fila?.capacidad_carga_kg);
  if (!fila || capacidad <= 0 || clave(envase).includes(String(capacidad))) return envase || "Sin envase";
  return `${envase} * ${capacidad} kg`;
}

function pideGrafico(valor: unknown) {
  if (valor === true) return true;
  const t = clave(valor);
  return t === "true" || t === "si" || t === "1";
}

function consultarProduccion(
  datos: DatosConsulta,
  args: Record<string, unknown>,
  desde: string,
  hasta: string,
): TablaIa {
  const agrupar = agruparDe(args.agrupar);
  const pedidos = [
    ...lista(args.nombres),
    ...(typeof args.nombre === "string" && args.nombre.trim() ? [args.nombre.trim()] : []),
  ];
  const grafico = pideGrafico(args.grafico);
  const jornadas = jornadasDe(datos).filter((item) => {
    if (!item.fecha || item.fecha < desde || item.fecha > hasta) return false;
    const envase = envaseVisible(datos, item.envase);
    return coincidePresentacion(pedidos, item.producto, envase, item.categoria);
  });
  const resumenBase = resumenAnalytics(jornadas, desde, hasta);
  if (agrupar === "total") {
    return {
      resumen: jornadas.length
        ? `Producción del ${fechaVisible(desde)} al ${fechaVisible(hasta)}: ${fmtKg(resumenBase.kgTotal)} en ${jornadas.length} jornadas.`
        : `No hay jornadas entre el ${fechaVisible(desde)} y el ${fechaVisible(hasta)}.`,
      fuente: "Jornadas de Producción. Los kilos son el peso registrado en cada jornada.",
      columnas: ["Jornadas", "Kg", "Pallets", "Unidades", "Hs disponibles", "Hs productivas", "Hs paradas"],
      filas: jornadas.length
        ? [[
            String(jornadas.length),
            nro(resumenBase.kgTotal),
            nro(jornadas.reduce((s, item) => s + item.pallets, 0)),
            nro(jornadas.reduce((s, item) => s + item.unidades, 0)),
            fmtHs(resumenBase.hsDisponibles),
            fmtHs(resumenBase.hsProductivas),
            fmtHs(resumenBase.hsParadasProg + resumenBase.hsParadasNo),
          ]]
        : [],
    };
  }

  const grupos = new Map<string, { a: string; b: string; kg: number; jornadas: number; fecha: string }>();
  for (const item of jornadas) {
    const fecha = item.fecha || "";
    const envase = envaseVisible(datos, item.envase);
    const claveGrupo =
      agrupar === "producto"
        ? item.producto
        : agrupar === "lote"
          ? item.lote
          : agrupar === "categoria"
            ? item.categoria
            : agrupar === "presentacion"
              ? `${item.producto} · ${envase}`
              : fecha;
    const extra =
      agrupar === "producto"
        ? item.categoria
        : agrupar === "lote"
          ? item.producto
          : agrupar === "presentacion"
            ? envase
            : "";
    const grupo = grupos.get(claveGrupo) ?? { a: claveGrupo || "—", b: extra, kg: 0, jornadas: 0, fecha };
    grupo.kg += item.kg;
    grupo.jornadas += 1;
    if (fecha && fecha < grupo.fecha) grupo.fecha = fecha;
    grupos.set(claveGrupo, grupo);
  }
  if (agrupar === "presentacion") {
    for (const pedido of pedidos) {
      const cubierto = [...grupos.values()].some((grupo) =>
        coincidePresentacion([pedido], grupo.a, grupo.b, ""),
      );
      if (!cubierto) grupos.set(`pedido:${pedido}`, { a: pedido, b: "", kg: 0, jornadas: 0, fecha: "" });
    }
  }
  const ordenados = [...grupos.values()].sort((a, b) =>
    agrupar === "dia" ? a.fecha.localeCompare(b.fecha) : b.kg - a.kg || a.a.localeCompare(b.a, "es"),
  );
  const corte = cortar(
    ordenados.map((grupo) =>
      agrupar === "dia"
        ? [fechaVisible(grupo.fecha), nro(grupo.kg), String(grupo.jornadas)]
        : [grupo.a || "—", grupo.b || "—", nro(grupo.kg), String(grupo.jornadas)],
    ),
  );
  const titulo =
    agrupar === "producto"
      ? "Producto"
      : agrupar === "lote"
        ? "Lote"
        : agrupar === "categoria"
          ? "Categoría"
          : agrupar === "presentacion"
            ? "Presentación"
            : "Fecha";
  const filasTabla =
    agrupar === "dia" || agrupar === "categoria" || agrupar === "presentacion"
      ? ordenados.map((grupo) =>
          agrupar === "dia"
            ? [fechaVisible(grupo.fecha), nro(grupo.kg), String(grupo.jornadas)]
            : [grupo.a || "—", nro(grupo.kg), String(grupo.jornadas)],
        )
      : corte.filas;
  const barras = grafico
    ? ordenados.slice(0, 12).map((grupo) => ({
        etiqueta: agrupar === "dia" ? fechaVisible(grupo.fecha) : grupo.a || "—",
        valor: Math.round(grupo.kg * 1000) / 1000,
      }))
    : undefined;
  return {
    resumen: ordenados.length
      ? `Producción del ${fechaVisible(desde)} al ${fechaVisible(hasta)} por ${titulo.toLowerCase()}: ${fmtKg(resumenBase.kgTotal)}.${corte.nota}`
      : `No hay jornadas entre el ${fechaVisible(desde)} y el ${fechaVisible(hasta)}.`,
    fuente: "Jornadas de Producción. La presentación junta el producto con el envase de la solicitud.",
    columnas:
      agrupar === "dia" || agrupar === "categoria" || agrupar === "presentacion"
        ? [titulo, "Kg", "Jornadas"]
        : [titulo, "Detalle", "Kg", "Jornadas"],
    filas: agrupar === "dia" || agrupar === "categoria" || agrupar === "presentacion" ? filasTabla : corte.filas,
    barras,
  };
}

function consultarPlan(datos: DatosConsulta, desde: string, hasta: string): TablaIa {
  const plan = armarPlan(datos.planMensual).filter((item) => item.fecha && item.fecha >= desde && item.fecha <= hasta);
  const real = new Map<string, number>();
  for (const jornada of jornadasDe(datos)) {
    if (!jornada.fecha || jornada.fecha < desde || jornada.fecha > hasta) continue;
    real.set(jornada.categoria, (real.get(jornada.categoria) ?? 0) + jornada.kg);
  }
  const grupos = new Map<string, number>();
  for (const linea of plan) {
    const categoria = linea.categoria || "Sin categoría";
    grupos.set(categoria, (grupos.get(categoria) ?? 0) + linea.kg);
  }
  for (const categoria of real.keys()) {
    if (!grupos.has(categoria)) grupos.set(categoria, 0);
  }
  const filas = [...grupos.entries()]
    .map(([categoria, kgPlan]) => ({ categoria, kgPlan, kgReal: real.get(categoria) ?? 0 }))
    .sort((a, b) => b.kgPlan - a.kgPlan || a.categoria.localeCompare(b.categoria, "es"));
  const corte = cortar(filas.map((fila) => [fila.categoria, nro(fila.kgPlan), nro(fila.kgReal)]));
  const kgPlan = filas.reduce((s, fila) => s + fila.kgPlan, 0);
  return {
    resumen: filas.length
      ? `Plan del ${fechaVisible(desde)} al ${fechaVisible(hasta)}: ${fmtKg(kgPlan)} estimados.${corte.nota}`
      : `No hay planificación entre el ${fechaVisible(desde)} y el ${fechaVisible(hasta)}.`,
    fuente: "Kg estimados de planificación mensual, comparados con los kilos de las jornadas de ese período.",
    columnas: ["Categoría", "Kg plan", "Kg reales"],
    filas: corte.filas,
  };
}

function consultarTiempos(datos: DatosConsulta, desde: string, hasta: string): TablaIa {
  const resumen = resumenAnalytics(jornadasDe(datos), desde, hasta);
  return {
    resumen: resumen.sinDatos
      ? `No hay jornadas entre el ${fechaVisible(desde)} y el ${fechaVisible(hasta)}.`
      : `Tiempos del ${fechaVisible(desde)} al ${fechaVisible(hasta)}: ${fmtHs(resumen.hsProductivas)} productivas sobre ${fmtHs(resumen.hsDisponibles)} disponibles.`,
    fuente: "Horas guardadas en cada jornada de Producción.",
    columnas: ["Indicador", "Valor"],
    filas: [
      ["Jornadas", String(resumen.jornadas)],
      ["Kg producidos", fmtKg(resumen.kgTotal)],
      ["Hs disponibles", fmtHs(resumen.hsDisponibles)],
      ["Hs productivas", fmtHs(resumen.hsProductivas)],
      ["Hs paradas programadas", fmtHs(resumen.hsParadasProg)],
      ["Hs paradas no programadas", fmtHs(resumen.hsParadasNo)],
      ["Kg por hora productiva", resumen.hsProductivas > 0 ? `${nro(resumen.kgHora)} kg/h` : "—"],
    ],
  };
}

function consultarCausas(datos: DatosConsulta, args: Record<string, unknown>, desde: string, hasta: string): TablaIa {
  const resumen = resumenAnalytics(jornadasDe(datos), desde, hasta);
  const tipo = clave(args.tipo);
  const programadas = tipo !== "no" && tipo !== "noprogramadas";
  const noProgramadas = tipo !== "programadas" && tipo !== "prog";
  const filas = [
    ...(programadas
      ? resumen.causasProgramadas.map((item) => ["Programada", item.nombre, fmtHs(item.valor)])
      : []),
    ...(noProgramadas
      ? resumen.causasNoProgramadas.map((item) => ["No programada", item.nombre, fmtHs(item.valor)])
      : []),
  ];
  return {
    resumen: filas.length
      ? `Causas de paradas del ${fechaVisible(desde)} al ${fechaVisible(hasta)}: ${filas.length} causas.`
      : `No hay paradas con causa entre el ${fechaVisible(desde)} y el ${fechaVisible(hasta)}.`,
    fuente: "Horas de paradas programadas y no programadas, agrupadas por causa.",
    columnas: ["Tipo", "Causa", "Horas"],
    filas,
  };
}

function vistasSolicitud(datos: DatosConsulta) {
  const porSolicitud = new Map<number, { pallets: number; unidades: number; kg: number }>();
  for (const fila of datos.producciones) {
    const idSol = idEntero(fila.id_solicitud);
    if (idSol == null) continue;
    const bucket = porSolicitud.get(idSol) ?? { pallets: 0, unidades: 0, kg: 0 };
    bucket.pallets += numero(fila.pallets);
    bucket.unidades += numero(fila.unidades);
    bucket.kg += numero(fila.peso_kg);
    porSolicitud.set(idSol, bucket);
  }
  const productos = new Map(datos.productos.flatMap((fila) => {
    const id = idEntero(fila.id);
    return id == null ? [] : [[id, fila] as const];
  }));
  const versiones = new Map(datos.versiones.flatMap((fila) => {
    const id = idEntero(fila.id);
    return id == null ? [] : [[id, fila] as const];
  }));
  const envases = new Map(datos.envases.flatMap((fila) => {
    const id = idEntero(fila.id);
    return id == null ? [] : [[id, fila] as const];
  }));
  const etiquetas = new Map<number, Record<string, unknown>>();
  return datos.solicitudes.map((fila) =>
    enriquecerSolicitud(fila, porSolicitud, productos, versiones, envases, etiquetas),
  );
}

function textoPeriodo(desde: string, hasta: string) {
  if (desde && hasta) return `del ${fechaVisible(desde)} al ${fechaVisible(hasta)}`;
  return "al día de hoy";
}

function consultarSolicitudes(
  datos: DatosConsulta,
  args: Record<string, unknown>,
  desde: string,
  hasta: string,
): TablaIa {
  const estado = typeof args.estado === "string" ? args.estado : "";
  const busqueda = typeof args.nombre === "string" ? args.nombre : "";
  const filtradas = filtrarSolicitudes(vistasSolicitud(datos), {
    estado,
    busqueda,
    fechaDesde: desde,
    fechaHasta: hasta,
  });
  const corte = cortar(
    filtradas.map((item) => [
      fechaVisible(item.fecha_estimada || item.fecha_fin || item.fecha_registro),
      item.lote || "—",
      item.producto || "—",
      item.categoria || "—",
      item.estado_etiqueta,
      nro(item.kg_solicitados),
      nro(item.kg_cargados),
    ]),
  );
  const pendientes = filtradas.filter((item) => item.estado === "pendiente").length;
  const enCurso = filtradas.filter((item) => item.estado === "en_produccion").length;
  const listas = filtradas.filter((item) => item.estado === "completada").length;
  const canceladas = filtradas.filter((item) => item.estado === "cancelada").length;
  const periodo = textoPeriodo(desde, hasta);
  const pedido = clave(estado);
  const vacio = pedido.includes("cancel")
    ? `No hay solicitudes canceladas ${periodo}.`
    : pedido.includes("produccion")
      ? `No hay solicitudes iniciadas y sin finalizar ${periodo}.`
      : pedido.includes("completa")
        ? `No hay solicitudes finalizadas ${periodo}.`
        : pedido.includes("pendiente")
          ? `No hay solicitudes sin iniciar ${periodo}.`
          : `No hay solicitudes ${periodo}.`;
  return {
    resumen: filtradas.length
      ? `Solicitudes ${periodo}: ${filtradas.length} (${pendientes} sin iniciar, ${enCurso} en producción, ${listas} finalizadas, ${canceladas} canceladas).${corte.nota}`
      : vacio,
    fuente:
      "Pendiente = sin iniciar. En producción = ya se inició y no se finalizó. Completada = finalizada. Cancelada = marcada como cancelada.",
    columnas: ["Fecha", "Lote", "Producto", "Categoría", "Estado", "Kg pedidos", "Kg producidos"],
    filas: corte.filas,
  };
}

function consultarProduccionPendiente(
  datos: DatosConsulta,
  args: Record<string, unknown>,
  desde: string,
  hasta: string,
): TablaIa {
  const busqueda = typeof args.nombre === "string" ? args.nombre : "";
  const abiertas = filtrarSolicitudes(vistasSolicitud(datos), {
    busqueda,
    fechaDesde: desde,
    fechaHasta: hasta,
  }).filter((item) => item.estado === "pendiente" || item.estado === "en_produccion");
  const kg = abiertas.reduce((suma, item) => suma + item.kg_pendientes, 0);
  const corte = cortar(
    abiertas.map((item) => [
      item.lote || "—",
      item.producto || "—",
      item.estado_etiqueta,
      nro(item.kg_solicitados),
      nro(item.kg_cargados),
      nro(item.kg_pendientes),
    ]),
  );
  return {
    resumen: abiertas.length
      ? `Producción pendiente ${textoPeriodo(desde, hasta)}: ${fmtKg(kg)} en ${abiertas.length} solicitudes sin finalizar.${corte.nota}`
      : "No hay producción pendiente. No quedan kilos por elaborar.",
    fuente:
      "Producción pendiente = kilos pedidos menos kilos ya producidos. No es el estado Pendiente de la solicitud.",
    columnas: ["Lote", "Producto", "Estado", "Kg pedidos", "Kg producidos", "Kg pendientes"],
    filas: corte.filas,
  };
}

export function resolverOperacion(
  nombre: string,
  args: Record<string, unknown>,
  datos: DatosConsulta,
  desde: string,
  hasta: string,
): TablaIa | { error: string } {
  if (nombre === "stock_articulos") return consultarStock(datos, args, hasta);
  if (nombre === "movimientos_articulos") return consultarMovimientos(datos, args, desde, hasta);
  if (nombre === "consumos_articulos") return consultarConsumos(datos, args, desde, hasta);
  if (nombre === "produccion_resumen") return consultarProduccion(datos, args, desde, hasta);
  if (nombre === "planificacion") return consultarPlan(datos, desde, hasta);
  if (nombre === "tiempos_produccion") return consultarTiempos(datos, desde, hasta);
  if (nombre === "causas_paradas") return consultarCausas(datos, args, desde, hasta);
  if (nombre === "solicitudes") return consultarSolicitudes(datos, args, desde, hasta);
  if (nombre === "produccion_pendiente") return consultarProduccionPendiente(datos, args, desde, hasta);
  return { error: "Esa consulta no está disponible." };
}
