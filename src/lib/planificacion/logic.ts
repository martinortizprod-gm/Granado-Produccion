/** Plan mensual de capacidad. Portado de services/planificacion_service.py */

import { aFecha, clave, idEntero, numero, texto } from "@/lib/solicitudes/logic";

export const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const CATEGORIA_SUSTITUTO = "Sustituto Lácteo";
export const CATEGORIA_PREMEZCLA = "Premezcla";
export const CAUSAS_POR_DEFECTO = [
  "Preparación de línea",
  "Almuerzo",
  "Orden y limpieza",
  "Mantenimiento",
];
const RENDIMIENTOS_POR_DEFECTO: [number, string, number][] = [
  [1, CATEGORIA_SUSTITUTO, 0.7],
  [1, CATEGORIA_PREMEZCLA, 0.6],
  [2, CATEGORIA_SUSTITUTO, 1.5],
  [2, CATEGORIA_PREMEZCLA, 1.1],
  [3, CATEGORIA_SUSTITUTO, 2.0],
  [3, CATEGORIA_PREMEZCLA, 1.6],
  [4, CATEGORIA_SUSTITUTO, 2.4],
  [4, CATEGORIA_PREMEZCLA, 2.2],
];
const HORARIOS_POR_DEFECTO: [string, number][] = [
  ["Lunes", 9],
  ["Martes", 9],
  ["Miércoles", 9],
  ["Jueves", 9],
  ["Viernes", 8],
  ["Sábado", 0],
  ["Domingo", 0],
];
const CAPACIDADES_POR_DEFECTO: [string, number, number][] = [
  [CATEGORIA_SUSTITUTO, 750, 350],
  [CATEGORIA_PREMEZCLA, 1250, 357.14],
];
const PARADAS_POR_DEFECTO: Record<string, Record<number, number[]>> = {
  Lunes: { 1: [1.5, 0.8, 1, 0], 2: [1, 0.8, 0.7, 0], 3: [0.5, 0.8, 0.5, 0], 4: [0.3, 0.8, 0.3, 0] },
  Martes: { 1: [1, 0.8, 1, 0], 2: [0.5, 0.8, 0.7, 0], 3: [0.3, 0.8, 0.5, 0], 4: [0.2, 0.8, 0.3, 0] },
  Miércoles: { 1: [1, 0.8, 1, 0], 2: [0.5, 0.8, 0.7, 0], 3: [0.3, 0.8, 0.5, 0], 4: [0.2, 0.8, 0.3, 0] },
  Jueves: { 1: [1, 0.8, 1, 3], 2: [0.5, 0.8, 0.7, 2.5], 3: [0.3, 0.8, 0.5, 2], 4: [0.2, 0.8, 0.3, 1.5] },
  Viernes: { 1: [1, 0.8, 4.5, 0], 2: [0.5, 0.8, 4, 0], 3: [0.3, 0.8, 3.5, 0], 4: [0.2, 0.8, 2, 0] },
  Sábado: { 1: [0, 0, 0, 0], 2: [0, 0, 0, 0], 3: [0, 0, 0, 0], 4: [0, 0, 0, 0] },
  Domingo: { 1: [0, 0, 0, 0], 2: [0, 0, 0, 0], 3: [0, 0, 0, 0], 4: [0, 0, 0, 0] },
};

export const OPERARIOS_POR_DEFECTO = 2;
const TOLERANCIA_CUMPLIDO = 98;

export type RendimientoPlan = {
  id: number | null;
  cantidad_operarios: number;
  categoria: string;
  pallets_hora: number;
};
export type ParadaPlan = {
  id: number | null;
  dia_semana: string;
  cantidad_operarios: number;
  causa: string;
  horas: number;
};
export type HorarioPlan = {
  id: number | null;
  dia_semana: string;
  horas_disponibles: number;
};
export type CapacidadPlan = {
  id: number | null;
  categoria: string;
  kg_por_pallet: number;
  kg_por_batch: number;
};
export type ConfigPlan = {
  rendimientos: RendimientoPlan[];
  paradas: ParadaPlan[];
  horarios: HorarioPlan[];
  capacidades: CapacidadPlan[];
  operariosOpciones: number[];
  categorias: string[];
  causas: string[];
};
export type LineaPlan = {
  id: number | null;
  categoria: string;
  horas_productivas: number;
  pallets: number;
  kg: number;
  pallets_reales: number;
  kg_reales: number;
};
export type DiaPlan = {
  fecha: string;
  dia_semana: string;
  operarios: number;
  planificado: boolean;
  contempla: boolean;
  horas_disponibles: number;
  horas_paradas: number;
  horas_productivas: number;
  observaciones: string;
  lineas: LineaPlan[];
  categorias: string[];
  etiqueta_categorias: string;
  pallets_plan: number;
  kg_plan: number;
  pallets_reales: number;
  kg_reales: number;
  tiene_real: boolean;
  desvio_pct: number | null;
};
export type ResumenMes = {
  dias_planificados: number;
  horas_disponibles: number;
  horas_paradas: number;
  horas_paradas_no: number;
  horas_productivas: number;
  pallets_plan: number;
  kg_plan: number;
  pallets_reales: number;
  kg_reales: number;
  kg_plan_vigente: number;
  mes_en_curso: boolean;
  hasta: string | null;
  cumplimiento: number | null;
  cumple: boolean;
  desvio_pct: number | null;
};
export type DatosPlan = {
  mes: string;
  etiqueta: string;
  operarios: number;
  dias: DiaPlan[];
  resumen: ResumenMes;
  config: ConfigPlan;
  error: string | null;
};

export type AsignacionDia = { categoria: string; horas: number };
export type PatchFila = { id: number; datos: Record<string, unknown> };
export type FilaPlan = Record<string, unknown>;

type CrudoPlan = {
  mensual: Record<string, unknown>[];
  rendimientos: Record<string, unknown>[];
  paradas: Record<string, unknown>[];
  horarios: Record<string, unknown>[];
  capacidades: Record<string, unknown>[];
  produccion: Record<string, unknown>[];
  productos: Record<string, unknown>[];
  solicitudes: Record<string, unknown>[];
};

function r2(valor: number) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}
function r1(valor: number) {
  return Math.round((Number(valor) || 0) * 10) / 10;
}

export function hoyIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

function partes(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

export function primerDiaMes(iso?: string | null) {
  const base = iso && /^\d{4}-\d{2}/.test(iso) ? iso : hoyIso();
  return `${base.slice(0, 7)}-01`;
}

export function mesValido(valor: string | undefined, hoy = hoyIso()) {
  if (valor && /^\d{4}-\d{2}$/.test(valor)) {
    const m = Number(valor.slice(5, 7));
    if (m >= 1 && m <= 12) return `${valor}-01`;
  }
  return primerDiaMes(hoy);
}

export function mesDesplazado(mes: string, pasos: number) {
  const { y, m } = partes(primerDiaMes(mes));
  const total = y * 12 + (m - 1) + pasos;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

export function etiquetaMes(mes: string) {
  const { y, m } = partes(primerDiaMes(mes));
  const nombre = MESES[m - 1] ?? "";
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`;
}

export function diasDelMes(mes: string) {
  const { y, m } = partes(primerDiaMes(mes));
  const cantidad = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return Array.from({ length: cantidad }, (_, i) => `${y}-${mm}-${String(i + 1).padStart(2, "0")}`);
}

export function nombreDia(iso: string) {
  const { y, m, d } = partes(iso);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return DIAS_SEMANA[(wd + 6) % 7];
}

function diaAnterior(iso: string) {
  const { y, m, d } = partes(iso);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

function ordenDia(nombre: string) {
  const buscado = clave(nombre);
  const i = DIAS_SEMANA.findIndex((dia) => clave(dia) === buscado);
  return i < 0 ? DIAS_SEMANA.length : i;
}

function titulo(valor: string) {
  return valor
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function palletsHora(config: ConfigPlan, categoria: string, operarios: number) {
  const buscada = clave(categoria);
  const item = config.rendimientos.find(
    (r) => r.cantidad_operarios === operarios && clave(r.categoria) === buscada,
  );
  return item?.pallets_hora ?? 0;
}

export function horasDisponibles(config: ConfigPlan, dia: string) {
  const buscado = clave(dia);
  return config.horarios.find((h) => clave(h.dia_semana) === buscado)?.horas_disponibles ?? 0;
}

export function paradasDe(config: ConfigPlan, dia: string, operarios: number) {
  const buscado = clave(dia);
  const detalle: Record<string, number> = {};
  for (const causa of config.causas) detalle[causa] = 0;
  for (const item of config.paradas) {
    if (clave(item.dia_semana) !== buscado || item.cantidad_operarios !== operarios) continue;
    detalle[item.causa] = (detalle[item.causa] ?? 0) + item.horas;
  }
  return detalle;
}

export function horasParadas(config: ConfigPlan, dia: string, operarios: number) {
  return r2(Object.values(paradasDe(config, dia, operarios)).reduce((a, b) => a + b, 0));
}

export function capacidadDe(config: ConfigPlan, categoria: string, operarios: number) {
  const buscada = clave(categoria);
  const item = config.capacidades.find((c) => clave(c.categoria) === buscada);
  if (!item) return null;
  const pall = palletsHora(config, item.categoria, operarios);
  const kgHora = r2(pall * item.kg_por_pallet);
  const batchHora = item.kg_por_batch <= 0 ? 0 : r2(kgHora / item.kg_por_batch);
  return { ...item, pallets_hora: pall, kg_hora: kgHora, batch_hora: batchHora };
}

export function estimar(
  config: ConfigPlan,
  categoria: string,
  operarios: number,
  horas: number,
): [number, number] {
  const cap = capacidadDe(config, categoria, operarios);
  if (!cap || horas <= 0 || cap.pallets_hora <= 0) return [0, 0];
  const pallets = r2(horas * cap.pallets_hora);
  return [pallets, r2(pallets * cap.kg_por_pallet)];
}

function repartir(total: number, partes: number) {
  if (partes <= 0) return [];
  const base = r2(total / partes);
  const reparto = Array.from({ length: partes }, () => base);
  reparto[partes - 1] = r2(total - base * (partes - 1));
  return reparto.map((v) => Math.max(0, v));
}

function completarConfig(config: Omit<ConfigPlan, "operariosOpciones" | "categorias" | "causas">): ConfigPlan {
  const ops = new Set<number>();
  for (const item of config.paradas) if (item.cantidad_operarios > 0) ops.add(item.cantidad_operarios);
  for (const item of config.rendimientos) if (item.cantidad_operarios > 0) ops.add(item.cantidad_operarios);
  const categorias: string[] = [];
  for (const item of [...config.capacidades, ...config.rendimientos]) {
    if (item.categoria && !categorias.includes(item.categoria)) categorias.push(item.categoria);
  }
  const causas: string[] = [];
  for (const item of config.paradas) {
    if (item.causa && !causas.includes(item.causa)) causas.push(item.causa);
  }
  return {
    ...config,
    operariosOpciones: [...ops].sort((a, b) => a - b).length
      ? [...ops].sort((a, b) => a - b)
      : [OPERARIOS_POR_DEFECTO],
    categorias,
    causas: causas.length ? causas : [...CAUSAS_POR_DEFECTO],
  };
}

export function armarConfig(crudo: Pick<CrudoPlan, "rendimientos" | "paradas" | "horarios" | "capacidades">): ConfigPlan {
  let rendimientos: RendimientoPlan[] = [];
  for (const fila of crudo.rendimientos) {
    const operarios = idEntero(fila.cantidad_operarios);
    const categoria = texto(fila.categoria);
    if (operarios == null || categoria === "") continue;
    rendimientos.push({
      id: idEntero(fila.id),
      cantidad_operarios: operarios,
      categoria,
      pallets_hora: r2(numero(fila.pallets_hora)),
    });
  }
  if (!rendimientos.length) {
    rendimientos = RENDIMIENTOS_POR_DEFECTO.map(([operarios, categoria, pallets]) => ({
      id: null,
      cantidad_operarios: operarios,
      categoria,
      pallets_hora: pallets,
    }));
  }
  rendimientos.sort((a, b) => a.cantidad_operarios - b.cantidad_operarios || clave(a.categoria).localeCompare(clave(b.categoria)));

  let paradas: ParadaPlan[] = [];
  for (const fila of crudo.paradas) {
    const dia = texto(fila.dia_semana);
    const operarios = idEntero(fila.cantidad_operarios);
    const causa = texto(fila.causa);
    if (dia === "" || operarios == null || causa === "") continue;
    paradas.push({
      id: idEntero(fila.id),
      dia_semana: dia,
      cantidad_operarios: operarios,
      causa,
      horas: r2(numero(fila.horas)),
    });
  }
  if (!paradas.length) {
    for (const dia of DIAS_SEMANA) {
      const porOps = PARADAS_POR_DEFECTO[dia] ?? {};
      for (const operarios of [1, 2, 3, 4]) {
        const valores = porOps[operarios] ?? [0, 0, 0, 0];
        CAUSAS_POR_DEFECTO.forEach((causa, i) => {
          paradas.push({
            id: null,
            dia_semana: dia,
            cantidad_operarios: operarios,
            causa,
            horas: valores[i] ?? 0,
          });
        });
      }
    }
  }
  paradas.sort((a, b) => ordenDia(a.dia_semana) - ordenDia(b.dia_semana) || a.cantidad_operarios - b.cantidad_operarios);

  let horarios: HorarioPlan[] = [];
  for (const fila of crudo.horarios) {
    const dia = texto(fila.dia_semana);
    if (dia === "") continue;
    horarios.push({
      id: idEntero(fila.id),
      dia_semana: dia,
      horas_disponibles: r2(numero(fila.horas_disponibles)),
    });
  }
  if (!horarios.length) {
    horarios = HORARIOS_POR_DEFECTO.map(([dia, horas]) => ({
      id: null,
      dia_semana: dia,
      horas_disponibles: horas,
    }));
  }
  horarios.sort((a, b) => ordenDia(a.dia_semana) - ordenDia(b.dia_semana));

  let capacidades: CapacidadPlan[] = [];
  for (const fila of crudo.capacidades) {
    const categoria = texto(fila.categoria);
    if (categoria === "") continue;
    capacidades.push({
      id: idEntero(fila.id),
      categoria,
      kg_por_pallet: r2(numero(fila.kg_por_pallet)),
      kg_por_batch: r2(numero(fila.kg_por_batch)),
    });
  }
  if (!capacidades.length) {
    capacidades = CAPACIDADES_POR_DEFECTO.map(([categoria, kgPallet, kgBatch]) => ({
      id: null,
      categoria,
      kg_por_pallet: kgPallet,
      kg_por_batch: kgBatch,
    }));
  }
  capacidades.sort((a, b) => clave(a.categoria).localeCompare(clave(b.categoria)));
  return completarConfig({ rendimientos, paradas, horarios, capacidades });
}

function nombreCategoria(normalizada: string, config: ConfigPlan) {
  return config.categorias.find((nombre) => clave(nombre) === normalizada) ?? titulo(normalizada);
}

function categoriaPorSolicitud(crudo: Pick<CrudoPlan, "productos" | "solicitudes">) {
  const porProducto = new Map<number, string>();
  for (const fila of crudo.productos) {
    const id = idEntero(fila.id);
    if (id != null) porProducto.set(id, clave(fila.categoria));
  }
  const porSolicitud = new Map<number, string>();
  for (const fila of crudo.solicitudes) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    porSolicitud.set(id, porProducto.get(idEntero(fila.id_producto) ?? -1) ?? "");
  }
  return porSolicitud;
}

function realesDelMes(crudo: CrudoPlan, mes: string) {
  const categorias = categoriaPorSolicitud(crudo);
  const ym = mes.slice(0, 7);
  const acumulado = new Map<string, [number, number]>();
  for (const fila of crudo.produccion) {
    const fecha = aFecha(fila.fecha_registro);
    if (!fecha || fecha.slice(0, 7) !== ym) continue;
    const categoria = categorias.get(idEntero(fila.id_solicitud) ?? -1) ?? "";
    if (!categoria) continue;
    const llave = `${fecha}|${categoria}`;
    const actual = acumulado.get(llave) ?? [0, 0];
    actual[0] += numero(fila.pallets);
    actual[1] += numero(fila.peso_kg);
    acumulado.set(llave, actual);
  }
  const salida = new Map<string, [number, number]>();
  for (const [llave, vals] of acumulado) salida.set(llave, [r2(vals[0]), r2(vals[1])]);
  return salida;
}

function paradasNoDelMes(crudo: CrudoPlan, mes: string) {
  const ym = mes.slice(0, 7);
  let total = 0;
  for (const fila of crudo.produccion) {
    const fecha = aFecha(fila.fecha_registro);
    if (!fecha || fecha.slice(0, 7) !== ym) continue;
    total += numero(fila.hs_paradas_no_p);
  }
  return r2(total);
}

function filasDelMes(crudo: CrudoPlan, mes: string) {
  const ym = mes.slice(0, 7);
  return crudo.mensual
    .map((fila) => ({ fecha: aFecha(fila.fecha), fila }))
    .filter((item): item is { fecha: string; fila: Record<string, unknown> } => !!item.fecha && item.fecha.slice(0, 7) === ym)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (idEntero(a.fila.id) ?? 0) - (idEntero(b.fila.id) ?? 0));
}

function operariosDelMes(filas: { fila: Record<string, unknown> }[], config: ConfigPlan) {
  for (let i = filas.length - 1; i >= 0; i -= 1) {
    const valor = idEntero(filas[i].fila.disponibilidad_operarios_estimada);
    if (valor && valor > 0) return valor;
  }
  if (config.operariosOpciones.includes(OPERARIOS_POR_DEFECTO)) return OPERARIOS_POR_DEFECTO;
  return config.operariosOpciones[0] ?? OPERARIOS_POR_DEFECTO;
}

function cerrarDia(base: Omit<DiaPlan, "categorias" | "etiqueta_categorias" | "pallets_plan" | "kg_plan" | "pallets_reales" | "kg_reales" | "tiene_real" | "desvio_pct">): DiaPlan {
  const categorias = base.lineas.map((l) => l.categoria).filter(Boolean);
  const palletsPlan = r2(base.lineas.reduce((a, l) => a + l.pallets, 0));
  const kgPlan = r2(base.lineas.reduce((a, l) => a + l.kg, 0));
  const palletsReales = r2(base.lineas.reduce((a, l) => a + l.pallets_reales, 0));
  const kgReales = r2(base.lineas.reduce((a, l) => a + l.kg_reales, 0));
  const tieneReal = base.lineas.some((l) => l.kg_reales > 0.0005 || l.pallets_reales > 0.0005);
  const desvio = kgPlan <= 0.0005 || !tieneReal ? null : r1((kgReales / kgPlan - 1) * 100);
  return {
    ...base,
    categorias,
    etiqueta_categorias: categorias.join(" + "),
    pallets_plan: palletsPlan,
    kg_plan: kgPlan,
    pallets_reales: palletsReales,
    kg_reales: kgReales,
    tiene_real: tieneReal,
    desvio_pct: desvio,
  };
}

function armarDia(
  fecha: string,
  filas: Record<string, unknown>[],
  reales: Map<string, [number, number]>,
  config: ConfigPlan,
  operarios: number,
): DiaPlan {
  const dia = nombreDia(fecha);
  let disponibles: number;
  let paradas: number;
  let operariosDia: number;
  let observaciones: string;
  if (filas.length) {
    disponibles = Math.max(...filas.map((fila) => numero(fila.horas_disponibles)));
    paradas = Math.min(
      Math.max(...filas.map((fila) => numero(fila.horas_paradas_programadas))),
      disponibles,
    );
    operariosDia =
      filas.map((fila) => idEntero(fila.disponibilidad_operarios_estimada)).find((v) => v != null) ??
      operarios;
    observaciones = filas.map((fila) => texto(fila.observaciones)).find((v) => v) ?? "";
  } else {
    disponibles = horasDisponibles(config, dia);
    paradas = Math.min(disponibles > 0 ? horasParadas(config, dia, operarios) : 0, disponibles);
    operariosDia = operarios;
    observaciones = "";
  }
  const productivas = r2(Math.max(0, disponibles - paradas));
  const lineas: LineaPlan[] = [];
  const usadas = new Set<string>();
  for (const fila of filas) {
    const categoria = texto(fila.categoria);
    let palletsReales = 0;
    let kgReales = 0;
    if (categoria) {
      usadas.add(clave(categoria));
      [palletsReales, kgReales] = reales.get(`${fecha}|${clave(categoria)}`) ?? [0, 0];
    }
    lineas.push({
      id: idEntero(fila.id),
      categoria,
      horas_productivas: r2(numero(fila.horas_productivas)),
      pallets: r2(numero(fila.pallets_estimados)),
      kg: r2(numero(fila.kg_estimados)),
      pallets_reales: palletsReales,
      kg_reales: kgReales,
    });
  }
  for (const [llave, vals] of reales) {
    const [fechaReal, categoriaReal] = llave.split("|");
    if (fechaReal !== fecha || usadas.has(categoriaReal)) continue;
    if (vals[0] <= 0.0005 && vals[1] <= 0.0005) continue;
    lineas.push({
      id: null,
      categoria: nombreCategoria(categoriaReal, config),
      horas_productivas: 0,
      pallets: 0,
      kg: 0,
      pallets_reales: vals[0],
      kg_reales: vals[1],
    });
  }
  return cerrarDia({
    fecha,
    dia_semana: dia,
    operarios: operariosDia || operarios,
    planificado: filas.length > 0,
    contempla: disponibles > 0.0005,
    horas_disponibles: r2(disponibles),
    horas_paradas: r2(paradas),
    horas_productivas: productivas,
    observaciones,
    lineas,
  });
}

export function resumenMes(mes: string, dias: DiaPlan[], horasParadasNo: number, hoy = hoyIso()): ResumenMes {
  const mesBase = primerDiaMes(mes);
  const enCurso = mesBase.slice(0, 7) === hoy.slice(0, 7);
  const futuro = mesBase > primerDiaMes(hoy);
  const corte = enCurso ? hoy : futuro ? diaAnterior(mesBase) : null;
  const datos: ResumenMes = {
    dias_planificados: 0,
    horas_disponibles: 0,
    horas_paradas: 0,
    horas_paradas_no: horasParadasNo,
    horas_productivas: 0,
    pallets_plan: 0,
    kg_plan: 0,
    pallets_reales: 0,
    kg_reales: 0,
    kg_plan_vigente: 0,
    mes_en_curso: enCurso,
    hasta: enCurso ? hoy : null,
    cumplimiento: null,
    cumple: false,
    desvio_pct: null,
  };
  for (const dia of dias) {
    if (dia.planificado) datos.dias_planificados += 1;
    datos.horas_disponibles += dia.horas_disponibles;
    datos.horas_paradas += dia.horas_paradas;
    datos.horas_productivas += dia.horas_productivas;
    datos.pallets_plan += dia.pallets_plan;
    datos.kg_plan += dia.kg_plan;
    datos.pallets_reales += dia.pallets_reales;
    datos.kg_reales += dia.kg_reales;
    if (corte == null || dia.fecha <= corte) datos.kg_plan_vigente += dia.kg_plan;
  }
  for (const campo of [
    "horas_disponibles",
    "horas_paradas",
    "horas_productivas",
    "pallets_plan",
    "kg_plan",
    "pallets_reales",
    "kg_reales",
    "kg_plan_vigente",
  ] as const) {
    datos[campo] = r2(datos[campo]);
  }
  datos.cumplimiento =
    datos.kg_plan_vigente <= 0.0005 ? null : r1((datos.kg_reales / datos.kg_plan_vigente) * 100);
  datos.cumple = datos.cumplimiento != null && datos.cumplimiento >= TOLERANCIA_CUMPLIDO;
  datos.desvio_pct =
    datos.kg_plan_vigente <= 0.0005 || datos.kg_reales <= 0.0005
      ? null
      : r1((datos.kg_reales / datos.kg_plan_vigente) * 100 - 100);
  return datos;
}

export function armarPlan(crudo: CrudoPlan, mes: string, operarios: number | null, hoy = hoyIso()): DatosPlan {
  const mesBase = primerDiaMes(mes);
  const config = armarConfig(crudo);
  const filas = filasDelMes(crudo, mesBase);
  const reales = realesDelMes(crudo, mesBase);
  const elegidos = operarios && operarios > 0 ? operarios : operariosDelMes(filas, config);
  const porFecha = new Map<string, Record<string, unknown>[]>();
  for (const item of filas) {
    const lista = porFecha.get(item.fecha) ?? [];
    lista.push(item.fila);
    porFecha.set(item.fecha, lista);
  }
  const dias = diasDelMes(mesBase).map((fecha) =>
    armarDia(fecha, porFecha.get(fecha) ?? [], reales, config, elegidos),
  );
  return {
    mes: mesBase,
    etiqueta: etiquetaMes(mesBase),
    operarios: elegidos,
    dias,
    resumen: resumenMes(mesBase, dias, paradasNoDelMes(crudo, mesBase), hoy),
    config,
    error: null,
  };
}

export function planVacio(mes: string, operarios: number | null, error: string): DatosPlan {
  const mesBase = primerDiaMes(mes);
  const config = armarConfig({ rendimientos: [], paradas: [], horarios: [], capacidades: [] });
  return {
    mes: mesBase,
    etiqueta: etiquetaMes(mesBase),
    operarios: operarios && operarios > 0 ? operarios : OPERARIOS_POR_DEFECTO,
    dias: [],
    resumen: resumenMes(mesBase, [], 0),
    config,
    error,
  };
}

export function validarDia(
  contempla: boolean,
  horasDisponiblesValor: number,
  horasParadasValor: number,
  asignaciones: AsignacionDia[],
) {
  const errores: string[] = [];
  if (!contempla) return errores;
  const disponibles = numero(horasDisponiblesValor);
  const paradas = numero(horasParadasValor);
  if (disponibles <= 0) errores.push("Cargá las horas disponibles o destildá la contemplación.");
  if (disponibles > 24) errores.push("Las horas disponibles no pueden superar 24.");
  if (paradas < 0) errores.push("Las horas de paradas no pueden ser negativas.");
  if (paradas > disponibles) errores.push("Las paradas no pueden superar las horas disponibles.");
  const productivas = Math.max(0, disponibles - paradas);
  const vistas = new Set<string>();
  let asignadas = 0;
  for (const item of asignaciones) {
    const nombre = texto(item.categoria);
    if (!nombre) continue;
    if (vistas.has(clave(nombre))) errores.push(`La categoría ${nombre} está repetida.`);
    vistas.add(clave(nombre));
    asignadas += Math.max(0, numero(item.horas));
  }
  if (asignadas - productivas > 0.005) {
    errores.push("Las horas asignadas por categoría superan las horas productivas.");
  }
  return errores;
}

function filaExcel(
  id: number,
  fecha: string,
  operarios: number,
  disponibles: number,
  paradas: number,
  productivas: number,
  observaciones: string,
  categoria: string,
  pallets: number | null,
  kg: number | null,
): FilaPlan {
  return {
    id,
    fecha,
    disponibilidad_operarios_estimada: operarios,
    horas_disponibles: disponibles,
    horas_paradas_programadas: paradas,
    horas_productivas: productivas,
    observaciones: texto(observaciones) || null,
    categoria: texto(categoria) || null,
    pallets_estimados: pallets,
    kg_estimados: kg,
  };
}

export function filasGenerar(
  mes: string,
  operarios: number,
  config: ConfigPlan,
  fechasExistentes: Set<string>,
  siguienteId: number,
) {
  const nuevas: FilaPlan[] = [];
  let id = siguienteId;
  for (const fecha of diasDelMes(mes)) {
    if (fechasExistentes.has(fecha)) continue;
    const dia = nombreDia(fecha);
    const disponibles = horasDisponibles(config, dia);
    const paradas = disponibles > 0 ? horasParadas(config, dia, operarios) : 0;
    nuevas.push(
      filaExcel(
        id,
        fecha,
        operarios,
        disponibles,
        paradas,
        r2(Math.max(0, disponibles - paradas)),
        "",
        "",
        null,
        null,
      ),
    );
    id += 1;
  }
  return nuevas;
}

export function cambiosRecalcular(
  filas: { fecha: string; fila: Record<string, unknown> }[],
  operarios: number,
  config: ConfigPlan,
): PatchFila[] {
  const porFecha = new Map<string, Record<string, unknown>[]>();
  for (const item of filas) {
    const lista = porFecha.get(item.fecha) ?? [];
    lista.push(item.fila);
    porFecha.set(item.fecha, lista);
  }
  const cambios: PatchFila[] = [];
  for (const [fecha, grupo] of porFecha) {
    const dia = nombreDia(fecha);
    const contempla = grupo.some((fila) => numero(fila.horas_disponibles) > 0);
    const disponibles = contempla ? horasDisponibles(config, dia) : 0;
    const paradas = disponibles > 0 ? horasParadas(config, dia, operarios) : 0;
    const productivas = r2(Math.max(0, disponibles - paradas));
    const conCategoria = grupo.filter((fila) => texto(fila.categoria));
    const reparto = repartir(productivas, conCategoria.length);
    let indice = 0;
    for (const fila of grupo) {
      const identificador = idEntero(fila.id);
      if (identificador == null) continue;
      const categoria = texto(fila.categoria);
      let horas = productivas;
      let pallets: number | null = null;
      let kg: number | null = null;
      if (categoria) {
        horas = reparto[indice] ?? 0;
        indice += 1;
        [pallets, kg] = estimar(config, categoria, operarios, horas);
      }
      cambios.push({
        id: identificador,
        datos: {
          disponibilidad_operarios_estimada: operarios,
          horas_disponibles: disponibles,
          horas_paradas_programadas: paradas,
          horas_productivas: horas,
          pallets_estimados: pallets,
          kg_estimados: kg,
        },
      });
    }
  }
  return cambios;
}

export function cambiosEstimaciones(
  filas: { fila: Record<string, unknown> }[],
  operarios: number,
  config: ConfigPlan,
): PatchFila[] {
  const cambios: PatchFila[] = [];
  for (const item of filas) {
    const identificador = idEntero(item.fila.id);
    const categoria = texto(item.fila.categoria);
    if (identificador == null || categoria === "") continue;
    const ops =
      idEntero(item.fila.disponibilidad_operarios_estimada) || operarios || OPERARIOS_POR_DEFECTO;
    const [pallets, kg] = estimar(config, categoria, ops, numero(item.fila.horas_productivas));
    cambios.push({ id: identificador, datos: { pallets_estimados: pallets, kg_estimados: kg } });
  }
  return cambios;
}

export function prepararDia(input: {
  fecha: string;
  operarios: number;
  contempla: boolean;
  horasDisponibles: number;
  horasParadas: number;
  observaciones: string;
  asignaciones: AsignacionDia[];
  config: ConfigPlan;
  idsExistentes: number[];
  siguienteId: number;
}) {
  let disponibles = input.contempla ? r2(Math.max(0, numero(input.horasDisponibles))) : 0;
  let paradas = input.contempla ? r2(Math.max(0, numero(input.horasParadas))) : 0;
  paradas = Math.min(paradas, disponibles);
  const productivas = r2(Math.max(0, disponibles - paradas));
  let limpias = input.asignaciones
    .map((item) => ({ categoria: texto(item.categoria), horas: r2(Math.max(0, numero(item.horas))) }))
    .filter((item) => item.categoria);
  if (!input.contempla) limpias = [];
  else if (limpias.length && productivas > 0) {
    const faltantes = limpias.filter((item) => item.horas <= 0);
    if (faltantes.length) {
      const reparto = repartir(
        Math.max(0, productivas - limpias.filter((item) => item.horas > 0).reduce((a, item) => a + item.horas, 0)),
        faltantes.length,
      );
      let indice = 0;
      limpias = limpias.map((item) => {
        if (item.horas > 0) return item;
        const horas = reparto[indice] ?? 0;
        indice += 1;
        return { ...item, horas };
      });
    }
  } else if (productivas <= 0) limpias = [];

  const objetivo: { categoria: string; horas: number; pallets: number | null; kg: number | null }[] = [];
  if (limpias.length) {
    for (const item of limpias) {
      const [pallets, kg] = estimar(input.config, item.categoria, input.operarios, item.horas);
      objetivo.push({ categoria: item.categoria, horas: item.horas, pallets, kg });
    }
  } else objetivo.push({ categoria: "", horas: productivas, pallets: null, kg: null });

  const updates: PatchFila[] = [];
  input.idsExistentes.slice(0, objetivo.length).forEach((id, i) => {
    const item = objetivo[i];
    updates.push({
      id,
      datos: {
        fecha: input.fecha,
        disponibilidad_operarios_estimada: input.operarios,
        horas_disponibles: disponibles,
        horas_paradas_programadas: paradas,
        horas_productivas: item.horas,
        observaciones: texto(input.observaciones) || null,
        categoria: item.categoria || null,
        pallets_estimados: item.pallets,
        kg_estimados: item.kg,
      },
    });
  });
  const inserts: FilaPlan[] = [];
  let siguiente = input.siguienteId;
  for (const item of objetivo.slice(input.idsExistentes.length)) {
    inserts.push(
      filaExcel(
        siguiente,
        input.fecha,
        input.operarios,
        disponibles,
        paradas,
        item.horas,
        input.observaciones,
        item.categoria,
        item.pallets,
        item.kg,
      ),
    );
    siguiente += 1;
  }
  return {
    updates,
    inserts,
    deletes: input.idsExistentes.slice(objetivo.length),
  };
}

export function validarRendimientos(items: RendimientoPlan[]) {
  if (items.some((item) => item.pallets_hora < 0)) return ["Los pallets por hora no pueden ser negativos."];
  return [];
}

export function validarCapacidades(items: CapacidadPlan[]) {
  const vistas = new Set<string>();
  const limpios = items.filter((item) => texto(item.categoria));
  for (const item of limpios) {
    if (vistas.has(clave(item.categoria))) return [`La categoría ${item.categoria} está repetida.`];
    vistas.add(clave(item.categoria));
    if (item.kg_por_pallet <= 0) return [`Cargá los kg por pallet de ${item.categoria}.`];
    if (item.kg_por_batch <= 0) return [`Cargá los kg por batch de ${item.categoria}.`];
  }
  if (!limpios.length) return ["Cargá al menos una categoría."];
  return [];
}

export function validarHorarios(items: HorarioPlan[], config: ConfigPlan, operarios: number) {
  const avisos: string[] = [];
  for (const item of items) {
    if (item.horas_disponibles < 0 || item.horas_disponibles > 24) {
      return [`Las horas de ${item.dia_semana} deben estar entre 0 y 24.`];
    }
    const paradas = horasParadas(config, item.dia_semana, operarios);
    if (item.horas_disponibles > 0 && paradas > item.horas_disponibles) {
      avisos.push(
        `En ${item.dia_semana} las paradas (${paradas} hs) superan las horas disponibles.`,
      );
    }
  }
  return avisos;
}

export function validarParadas(items: ParadaPlan[]) {
  if (items.some((item) => item.horas < 0)) return ["Las horas de parada no pueden ser negativas."];
  return [];
}
