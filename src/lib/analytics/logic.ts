/** Indicadores de Data Analytics. Puerto de services/analytics_service.py */

import {
  aFecha,
  clave,
  fechaVisible,
  idEntero,
  numero,
  texto,
} from "@/lib/solicitudes/logic";
import { hoyIso } from "@/lib/planificacion/logic";

export const SIN_CATEGORIA = "Sin categoría";
export const SIN_ENVASE = "Sin envase";
export const PRESETS = [
  "Mes actual",
  "Mes anterior",
  "Últimos 30 días",
  "Año actual",
  "Personalizado",
] as const;

export type PresetAnalytics = (typeof PRESETS)[number];

export type ParteIndicador = {
  nombre: string;
  valor: number;
  porcentaje: number;
  extra: number;
};

export type PuntoDiario = {
  fecha: string;
  etiqueta: string;
  kg: number;
  hsDisponibles: number;
  hsProductivas: number;
  hsParadasProg: number;
  hsParadasNo: number;
  jornadas: number;
};

export type ParadaCausa = { causa: string; horas: number };

export type JornadaAnalytics = {
  id: number;
  fecha: string | null;
  kg: number;
  pallets: number;
  unidades: number;
  hsDisponibles: number;
  hsProductivas: number;
  hsParadasProg: number;
  hsParadasNo: number;
  rendimientoKgH: number;
  categoria: string;
  envase: string;
  producto: string;
  lote: string;
  ordenProduccion: string;
  idSolicitud: number | null;
  paradasProg: ParadaCausa[];
  paradasNo: ParadaCausa[];
};

export type ResumenAnalytics = {
  desde: string;
  hasta: string;
  periodo: string;
  jornadas: number;
  diasConRegistro: number;
  kgTotal: number;
  kgPromedioDia: number;
  kgHora: number;
  hsDisponibles: number;
  hsProductivas: number;
  hsParadasProg: number;
  hsParadasNo: number;
  hsDisponiblesDia: number;
  hsProductivasDia: number;
  hsParadasProgDia: number;
  hsParadasNoDia: number;
  utilizacionPct: number;
  diario: PuntoDiario[];
  serie: PuntoDiario[];
  modoSerie: "dia" | "semana" | "mes";
  porCategoria: ParteIndicador[];
  porEnvase: ParteIndicador[];
  promedioCategoria: ParteIndicador[];
  causasProgramadas: ParteIndicador[];
  causasNoProgramadas: ParteIndicador[];
  detalle: JornadaAnalytics[];
  sinDatos: boolean;
};

export type LineaPlanAnalytics = {
  fecha: string | null;
  categoria: string;
  kg: number;
};

export type PuntoPlanReal = {
  fecha: string;
  etiqueta: string;
  kgPlan: number;
  kgReal: number;
};

export type ResumenPlanAnalytics = {
  kgPlan: number;
  kgPlanVigente: number;
  kgReal: number;
  cumplimiento: number | null;
  desvioPct: number | null;
  serie: PuntoPlanReal[];
  tienePlan: boolean;
};

export type CrudoAnalytics = {
  producciones: Record<string, unknown>[];
  solicitudes: Record<string, unknown>[];
  productos: Record<string, unknown>[];
  envases: Record<string, unknown>[];
  causas: Record<string, unknown>[];
  paradasProg: Record<string, unknown>[];
  paradasNo: Record<string, unknown>[];
};

/** Misma tolerancia que Planificación (`TOLERANCIA_CUMPLIDO`). */
export const CUMPLE_PLAN = 98;

function nro(valor: number, decimales = 1) {
  const n = Number(valor) || 0;
  if (decimales === 0 || Math.abs(n - Math.round(n)) < 0.05) {
    return Math.round(n).toLocaleString("es-AR");
  }
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function fmtKg(valor: number) {
  return `${nro(valor, 1)} kg`;
}

export function fmtHs(valor: number) {
  return `${nro(valor, 1)} h`;
}

export function fmtPct(valor: number) {
  return `${nro(valor, 1)} %`;
}

export function fmtKgH(valor: number) {
  return `${nro(valor, 1)} kg/h`;
}

export function etiquetaPeriodo(desde: string, hasta: string) {
  return `${fechaVisible(desde)} — ${fechaVisible(hasta)}`;
}

function partesFecha(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

export function sumarDias(iso: string, dias: number) {
  const { y, m, d } = partesFecha(iso);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function diasEntre(desde: string, hasta: string) {
  const a = partesFecha(desde);
  const b = partesFecha(hasta);
  const ua = Date.UTC(a.y, a.m - 1, a.d);
  const ub = Date.UTC(b.y, b.m - 1, b.d);
  return Math.floor((ub - ua) / 86400000);
}

export function diasCalendario(desde: string, hasta: string) {
  if (desde > hasta) return [];
  const cantidad = diasEntre(desde, hasta) + 1;
  return Array.from({ length: cantidad }, (_, i) => sumarDias(desde, i));
}

export function rangoSemana(hoy = hoyIso()) {
  const [y, m, d] = hoy.slice(0, 10).split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const aLunes = dow === 0 ? -6 : 1 - dow;
  return { desde: sumarDias(hoy, aLunes), hasta: hoy };
}

export function rangoPreset(
  nombre: string,
  hoy = hoyIso(),
): { desde: string; hasta: string } | null {
  const { y, m } = partesFecha(hoy);
  const mes = String(m).padStart(2, "0");
  if (nombre === "Mes actual") {
    return { desde: `${y}-${mes}-01`, hasta: hoy };
  }
  if (nombre === "Mes anterior") {
    const primeroActual = `${y}-${mes}-01`;
    const hasta = sumarDias(primeroActual, -1);
    return { desde: `${hasta.slice(0, 7)}-01`, hasta };
  }
  if (nombre === "Últimos 30 días") {
    return { desde: sumarDias(hoy, -29), hasta: hoy };
  }
  if (nombre === "Año actual") {
    return { desde: `${y}-01-01`, hasta: hoy };
  }
  return null;
}

function mapaFilas(filas: Record<string, unknown>[]) {
  const out = new Map<number, Record<string, unknown>>();
  for (const fila of filas) {
    const ident = idEntero(fila.id);
    if (ident != null) out.set(ident, fila);
  }
  return out;
}

function mapaParadas(
  filas: Record<string, unknown>[],
  causas: Map<number, string>,
) {
  const out = new Map<number, ParadaCausa[]>();
  for (const fila of filas) {
    const idProd = idEntero(fila.id_produccion);
    if (idProd == null) continue;
    const idCausa = idEntero(fila.id_causas);
    const causa = idCausa != null ? causas.get(idCausa) || "—" : "—";
    const lista = out.get(idProd) ?? [];
    lista.push({ causa, horas: numero(fila.tiempo_en_hs) });
    out.set(idProd, lista);
  }
  return out;
}

export function armarJornadas(crudo: CrudoAnalytics): JornadaAnalytics[] {
  const solicitudes = mapaFilas(crudo.solicitudes);
  const productos = mapaFilas(crudo.productos);
  const envases = mapaFilas(crudo.envases);
  const causas = new Map<number, string>();
  for (const fila of crudo.causas) {
    const ident = idEntero(fila.id);
    const nombre = texto(fila.causa);
    if (ident != null && nombre) causas.set(ident, nombre);
  }
  const paradasP = mapaParadas(crudo.paradasProg, causas);
  const paradasN = mapaParadas(crudo.paradasNo, causas);

  const lista: JornadaAnalytics[] = [];
  for (const fila of crudo.producciones) {
    const ident = idEntero(fila.id);
    if (ident == null) continue;
    const solicitud = solicitudes.get(idEntero(fila.id_solicitud) ?? -1) ?? {};
    const producto = productos.get(idEntero(solicitud.id_producto) ?? -1) ?? {};
    const envase = envases.get(idEntero(producto.id_envase) ?? -1) ?? {};
    const kg = numero(fila.peso_kg);
    const hsProd = numero(fila.hs_productivas);
    const rendimiento = numero(fila.rendimiento_kg_h);
    lista.push({
      id: ident,
      fecha: aFecha(fila.fecha_registro),
      kg,
      pallets: numero(fila.pallets),
      unidades: numero(fila.unidades),
      hsDisponibles: numero(fila.hs_disponibles),
      hsProductivas: hsProd,
      hsParadasProg: numero(fila.hs_paradas_programadas),
      hsParadasNo: numero(fila.hs_paradas_no_p),
      rendimientoKgH: rendimiento > 0.0005 ? rendimiento : hsProd > 0.0005 ? kg / hsProd : 0,
      categoria: texto(producto.categoria) || SIN_CATEGORIA,
      envase: texto(envase.envase) || SIN_ENVASE,
      producto: texto(producto.producto) || "Sin producto",
      lote: texto(solicitud.lote),
      ordenProduccion: texto(solicitud.orden_produccion),
      idSolicitud: idEntero(fila.id_solicitud),
      paradasProg: paradasP.get(ident) ?? [],
      paradasNo: paradasN.get(ident) ?? [],
    });
  }
  lista.sort((a, b) => {
    const fa = a.fecha || "";
    const fb = b.fecha || "";
    if (fa !== fb) return fa < fb ? 1 : -1;
    return b.id - a.id;
  });
  return lista;
}

function partesDe(mapa: Map<string, number>, total: number, incluirCero = true) {
  const items: ParteIndicador[] = [];
  for (const [nombre, valor] of mapa.entries()) {
    if (!incluirCero && valor <= 0.0005) continue;
    items.push({
      nombre,
      valor,
      porcentaje: total > 0.0005 ? (valor / total) * 100 : 0,
      extra: 0,
    });
  }
  items.sort((a, b) => b.valor - a.valor || clave(a.nombre).localeCompare(clave(b.nombre)));
  return items;
}

function promedioCategoria(catDia: Map<string, Map<string, number>>) {
  const items: ParteIndicador[] = [];
  for (const [nombre, porDia] of catDia.entries()) {
    const dias = porDia.size;
    if (dias <= 0) continue;
    let suma = 0;
    for (const valor of porDia.values()) suma += valor;
    items.push({
      nombre,
      valor: suma / dias,
      porcentaje: 0,
      extra: dias,
    });
  }
  items.sort((a, b) => b.valor - a.valor || clave(a.nombre).localeCompare(clave(b.nombre)));
  return items;
}

export function modoSerie(desde: string, hasta: string): "dia" | "semana" | "mes" {
  const dias = diasEntre(desde, hasta) + 1;
  if (dias <= 45) return "dia";
  if (dias <= 210) return "semana";
  return "mes";
}

function etiquetaPunto(iso: string, modo: "dia" | "semana" | "mes") {
  if (modo === "mes") {
    const { y, m } = partesFecha(iso);
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${meses[m - 1]} ${String(y).slice(2)}`;
  }
  return fechaVisible(iso).slice(0, 5);
}

function claveGrupo(iso: string, modo: "dia" | "semana" | "mes", origen: string) {
  if (modo === "mes") return iso.slice(0, 7);
  if (modo === "dia") return iso;
  const offset = Math.floor(diasEntre(origen, iso) / 7);
  return sumarDias(origen, offset * 7);
}

export function agruparSerie(
  diario: PuntoDiario[],
  modo: "dia" | "semana" | "mes",
  desde: string,
): PuntoDiario[] {
  if (modo === "dia") return diario;
  const grupos = new Map<string, PuntoDiario>();
  const orden: string[] = [];
  for (const punto of diario) {
    const claveG = claveGrupo(punto.fecha, modo, desde);
    let acc = grupos.get(claveG);
    if (!acc) {
      acc = {
        fecha: claveG,
        etiqueta: etiquetaPunto(claveG, modo),
        kg: 0,
        hsDisponibles: 0,
        hsProductivas: 0,
        hsParadasProg: 0,
        hsParadasNo: 0,
        jornadas: 0,
      };
      grupos.set(claveG, acc);
      orden.push(claveG);
    }
    acc.kg += punto.kg;
    acc.hsDisponibles += punto.hsDisponibles;
    acc.hsProductivas += punto.hsProductivas;
    acc.hsParadasProg += punto.hsParadasProg;
    acc.hsParadasNo += punto.hsParadasNo;
    acc.jornadas += punto.jornadas;
  }
  return orden.map((k) => grupos.get(k)!);
}

function vacioResumen(desde: string, hasta: string): ResumenAnalytics {
  const diario = diasCalendario(desde, hasta).map((fecha) => ({
    fecha,
    etiqueta: etiquetaPunto(fecha, "dia"),
    kg: 0,
    hsDisponibles: 0,
    hsProductivas: 0,
    hsParadasProg: 0,
    hsParadasNo: 0,
    jornadas: 0,
  }));
  const modo = modoSerie(desde, hasta);
  return {
    desde,
    hasta,
    periodo: etiquetaPeriodo(desde, hasta),
    jornadas: 0,
    diasConRegistro: 0,
    kgTotal: 0,
    kgPromedioDia: 0,
    kgHora: 0,
    hsDisponibles: 0,
    hsProductivas: 0,
    hsParadasProg: 0,
    hsParadasNo: 0,
    hsDisponiblesDia: 0,
    hsProductivasDia: 0,
    hsParadasProgDia: 0,
    hsParadasNoDia: 0,
    utilizacionPct: 0,
    diario,
    serie: agruparSerie(diario, modo, desde),
    modoSerie: modo,
    porCategoria: [],
    porEnvase: [],
    promedioCategoria: [],
    causasProgramadas: [],
    causasNoProgramadas: [],
    detalle: [],
    sinDatos: true,
  };
}

export function resumenAnalytics(
  jornadas: JornadaAnalytics[],
  desde: string,
  hasta: string,
): ResumenAnalytics {
  const filtradas = jornadas.filter(
    (item) => item.fecha != null && item.fecha >= desde && item.fecha <= hasta,
  );
  const datos = vacioResumen(desde, hasta);
  datos.jornadas = filtradas.length;
  datos.detalle = filtradas;
  datos.sinDatos = filtradas.length === 0;
  if (!filtradas.length) return datos;

  const porDia = new Map<string, PuntoDiario>();
  const kgCat = new Map<string, number>();
  const kgEnv = new Map<string, number>();
  const catDia = new Map<string, Map<string, number>>();
  const causasP = new Map<string, number>();
  const causasN = new Map<string, number>();

  for (const item of filtradas) {
    const fecha = item.fecha as string;
    let punto = porDia.get(fecha);
    if (!punto) {
      punto = {
        fecha,
        etiqueta: etiquetaPunto(fecha, "dia"),
        kg: 0,
        hsDisponibles: 0,
        hsProductivas: 0,
        hsParadasProg: 0,
        hsParadasNo: 0,
        jornadas: 0,
      };
      porDia.set(fecha, punto);
    }
    punto.kg += item.kg;
    punto.hsDisponibles += item.hsDisponibles;
    punto.hsProductivas += item.hsProductivas;
    punto.hsParadasProg += item.hsParadasProg;
    punto.hsParadasNo += item.hsParadasNo;
    punto.jornadas += 1;
    kgCat.set(item.categoria, (kgCat.get(item.categoria) ?? 0) + item.kg);
    kgEnv.set(item.envase, (kgEnv.get(item.envase) ?? 0) + item.kg);
    let diasCat = catDia.get(item.categoria);
    if (!diasCat) {
      diasCat = new Map();
      catDia.set(item.categoria, diasCat);
    }
    diasCat.set(fecha, (diasCat.get(fecha) ?? 0) + item.kg);
    for (const parada of item.paradasProg) {
      causasP.set(parada.causa, (causasP.get(parada.causa) ?? 0) + parada.horas);
    }
    for (const parada of item.paradasNo) {
      causasN.set(parada.causa, (causasN.get(parada.causa) ?? 0) + parada.horas);
    }
  }

  datos.kgTotal = filtradas.reduce((s, i) => s + i.kg, 0);
  datos.hsDisponibles = filtradas.reduce((s, i) => s + i.hsDisponibles, 0);
  datos.hsProductivas = filtradas.reduce((s, i) => s + i.hsProductivas, 0);
  datos.hsParadasProg = filtradas.reduce((s, i) => s + i.hsParadasProg, 0);
  datos.hsParadasNo = filtradas.reduce((s, i) => s + i.hsParadasNo, 0);
  datos.diasConRegistro = porDia.size;
  if (datos.diasConRegistro) {
    datos.kgPromedioDia = datos.kgTotal / datos.diasConRegistro;
    datos.hsDisponiblesDia = datos.hsDisponibles / datos.diasConRegistro;
    datos.hsProductivasDia = datos.hsProductivas / datos.diasConRegistro;
    datos.hsParadasProgDia = datos.hsParadasProg / datos.diasConRegistro;
    datos.hsParadasNoDia = datos.hsParadasNo / datos.diasConRegistro;
  }
  if (datos.hsDisponibles > 0.0005) {
    datos.utilizacionPct = (datos.hsProductivas / datos.hsDisponibles) * 100;
  }
  if (datos.hsProductivas > 0.0005) {
    datos.kgHora = datos.kgTotal / datos.hsProductivas;
  }
  datos.diario = datos.diario.map((punto) => porDia.get(punto.fecha) ?? punto);
  datos.serie = agruparSerie(datos.diario, datos.modoSerie, desde);
  datos.porCategoria = partesDe(kgCat, datos.kgTotal);
  datos.porEnvase = partesDe(kgEnv, datos.kgTotal);
  datos.promedioCategoria = promedioCategoria(catDia);
  datos.causasProgramadas = partesDe(
    causasP,
    [...causasP.values()].reduce((s, v) => s + v, 0),
    false,
  );
  datos.causasNoProgramadas = partesDe(
    causasN,
    [...causasN.values()].reduce((s, v) => s + v, 0),
    false,
  );
  return datos;
}

export function opcionesFiltro(jornadas: JornadaAnalytics[]) {
  const categorias = new Set<string>();
  const productos = new Set<string>();
  for (const item of jornadas) {
    if (item.categoria) categorias.add(item.categoria);
    if (item.producto) productos.add(item.producto);
  }
  const porNombre = (a: string, b: string) => clave(a).localeCompare(clave(b), "es");
  return {
    categorias: [...categorias].sort(porNombre),
    productos: [...productos].sort(porNombre),
  };
}

export function productosDeCategoria(jornadas: JornadaAnalytics[], categoria: string) {
  const lista = categoria === "Todos" ? jornadas : jornadas.filter((item) => item.categoria === categoria);
  return opcionesFiltro(lista).productos;
}

export function filtrarJornadas(
  jornadas: JornadaAnalytics[],
  categoria: string,
  producto: string,
  envase = "Todos",
  causa: { nombre: string; tipo: "prog" | "no" } | null = null,
) {
  return jornadas.filter((item) => {
    if (categoria !== "Todos" && item.categoria !== categoria) return false;
    if (producto !== "Todos" && item.producto !== producto) return false;
    if (envase !== "Todos" && item.envase !== envase) return false;
    if (causa) {
      const lista = causa.tipo === "prog" ? item.paradasProg : item.paradasNo;
      if (!lista.some((p) => p.causa === causa.nombre)) return false;
    }
    return true;
  });
}

export function rangoDePunto(
  fecha: string,
  modo: "dia" | "semana" | "mes",
  desde: string,
  hasta: string,
) {
  if (modo === "dia") return { desde: fecha, hasta: fecha };
  if (modo === "mes") {
    const ym = fecha.length === 7 ? fecha : fecha.slice(0, 7);
    const inicio = `${ym}-01`;
    const { y, m } = partesFecha(`${ym}-01`);
    const finMes = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return {
      desde: inicio < desde ? desde : inicio,
      hasta: finMes > hasta ? hasta : finMes,
    };
  }
  const fin = sumarDias(fecha, 6);
  return {
    desde: fecha < desde ? desde : fecha,
    hasta: fin > hasta ? hasta : fin,
  };
}

export function rangoAnterior(desde: string, hasta: string) {
  const dias = diasEntre(desde, hasta) + 1;
  const hastaAnt = sumarDias(desde, -1);
  return { desde: sumarDias(hastaAnt, -(dias - 1)), hasta: hastaAnt };
}

export function deltaPct(actual: number, anterior: number) {
  if (anterior <= 0.0005) return null;
  return ((actual - anterior) / anterior) * 100;
}

export function armarPlan(filas: Record<string, unknown>[]): LineaPlanAnalytics[] {
  return filas.map((fila) => ({
    fecha: aFecha(fila.fecha),
    categoria: texto(fila.categoria),
    kg: numero(fila.kg_estimados),
  }));
}

function agruparPlanReal(
  diario: PuntoPlanReal[],
  modo: "dia" | "semana" | "mes",
  desde: string,
): PuntoPlanReal[] {
  if (modo === "dia") return diario;
  const grupos = new Map<string, PuntoPlanReal>();
  const orden: string[] = [];
  for (const punto of diario) {
    const claveG = claveGrupo(punto.fecha, modo, desde);
    let acc = grupos.get(claveG);
    if (!acc) {
      acc = {
        fecha: claveG,
        etiqueta: etiquetaPunto(claveG, modo),
        kgPlan: 0,
        kgReal: 0,
      };
      grupos.set(claveG, acc);
      orden.push(claveG);
    }
    acc.kgPlan += punto.kgPlan;
    acc.kgReal += punto.kgReal;
  }
  return orden.map((k) => grupos.get(k)!);
}

export function resumenPlan(
  plan: LineaPlanAnalytics[],
  diarioReal: PuntoDiario[],
  categoria: string,
  desde: string,
  hasta: string,
  hoy = hoyIso(),
): ResumenPlanAnalytics {
  const corte = hasta < hoy ? hasta : hoy;
  const porDiaPlan = new Map<string, number>();
  for (const linea of plan) {
    if (!linea.fecha || linea.fecha < desde || linea.fecha > hasta) continue;
    if (categoria !== "Todos" && clave(linea.categoria) !== clave(categoria)) continue;
    porDiaPlan.set(linea.fecha, (porDiaPlan.get(linea.fecha) ?? 0) + linea.kg);
  }
  const diario: PuntoPlanReal[] = diarioReal.map((punto) => ({
    fecha: punto.fecha,
    etiqueta: punto.etiqueta,
    kgPlan: porDiaPlan.get(punto.fecha) ?? 0,
    kgReal: punto.kg,
  }));
  let kgPlan = 0;
  let kgPlanVigente = 0;
  let kgReal = 0;
  for (const punto of diario) {
    kgPlan += punto.kgPlan;
    kgReal += punto.kgReal;
    if (punto.fecha <= corte) kgPlanVigente += punto.kgPlan;
  }
  const cumplimiento = kgPlanVigente <= 0.0005 ? null : (kgReal / kgPlanVigente) * 100;
  const desvioPct =
    kgPlanVigente <= 0.0005 || kgReal <= 0.0005 ? null : cumplimiento! - 100;
  return {
    kgPlan,
    kgPlanVigente,
    kgReal,
    cumplimiento,
    desvioPct,
    serie: agruparPlanReal(diario, modoSerie(desde, hasta), desde),
    tienePlan: kgPlan > 0.0005,
  };
}
