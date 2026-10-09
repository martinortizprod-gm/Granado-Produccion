import { fmtHs, fmtKg, sumarDias, type JornadaAnalytics, type PendienteEnvase } from "@/lib/analytics/logic";
import type { DatosStockAnalytics } from "@/lib/analytics/stock";
import { CODIGO_CORRUGADO, CODIGO_DURO, CODIGO_PALLETS_EXP } from "@/lib/produccion/logic";
import { diasDelMes, etiquetaMes, primerDiaMes } from "@/lib/planificacion/logic";
import { clave, fechaVisible } from "@/lib/solicitudes/logic";

export type DiaHoras = { fecha: string; disponibles: number };

export type LineaRecetaResumen = {
  idVersion: number;
  idIngrediente: number;
  nombre: string;
  participacion: number;
};

export type InsumoUsado = { idSolicitud: number; codigo: string };

export type FilaEnvaseResumen = { envase: string; elaborado: number; pendiente: number };

export type FilaConsumoResumen = {
  nombre: string;
  unidad: "kg" | "un";
  pendiente: number;
  stock: number;
  faltante: number;
  sobrante: number;
};

export type GrupoConsumo = { titulo: string; filas: FilaConsumoResumen[] };

export type ResumenMesVista = {
  etiqueta: string;
  desde: string;
  hasta: string;
  ultimaProduccion: string | null;
  fechaCorte: string | null;
  disponibles: number;
  finalizadas: number;
  productivas: number;
  paradas: number;
  pendientes: number;
  planificadas: number;
  sinPlanificar: number;
  notaHoras: string;
  envases: FilaEnvaseResumen[];
  consumos: GrupoConsumo[];
};

const INSUMOS = [
  { codigo: CODIGO_CORRUGADO, siempre: true },
  { codigo: CODIGO_DURO, siempre: false },
  { codigo: CODIGO_PALLETS_EXP, siempre: false },
];

function r1(valor: number) {
  return Math.round((Number(valor) || 0) * 10) / 10;
}

function sumaRango(dias: DiaHoras[], desde: string, hasta: string) {
  if (!desde || !hasta || desde > hasta) return 0;
  return dias
    .filter((dia) => dia.fecha >= desde && dia.fecha <= hasta)
    .reduce((suma, dia) => suma + dia.disponibles, 0);
}

function coincide(
  item: { categoria: string; producto: string; envase: string },
  categoria: string,
  producto: string,
  envase: string,
) {
  if (categoria !== "Todos" && item.categoria !== categoria) return false;
  if (producto !== "Todos" && item.producto !== producto) return false;
  if (envase !== "Todos" && item.envase !== envase) return false;
  return true;
}

function stockDe(stock: DatosStockAnalytics, familia: string, id: number | null, codigo = "") {
  const grupo = stock.articulos.find((item) => item.familia === familia);
  if (!grupo) return 0;
  const fila =
    (id != null ? grupo.items.find((item) => item.id === id) : undefined) ??
    (codigo ? grupo.items.find((item) => clave(item.codigo) === clave(codigo)) : undefined);
  return Math.max(0, fila?.stock ?? 0);
}

function filaConsumo(nombre: string, unidad: "kg" | "un", pendiente: number, stock: number): FilaConsumoResumen {
  return {
    nombre,
    unidad,
    pendiente,
    stock,
    faltante: Math.max(0, pendiente - stock),
    sobrante: Math.max(0, stock - pendiente),
  };
}

export function armarResumenMes(input: {
  mes: string;
  jornadas: JornadaAnalytics[];
  abiertas: PendienteEnvase[];
  dias: DiaHoras[];
  recetas: LineaRecetaResumen[];
  insumosUsados: InsumoUsado[];
  stock: DatosStockAnalytics;
  categoria: string;
  producto: string;
  envase: string;
}): ResumenMesVista {
  const inicioMes = primerDiaMes(input.mes);
  const finMes = diasDelMes(inicioMes).at(-1) ?? inicioMes;
  const ym = inicioMes.slice(0, 7);
  const dias = input.dias.filter((dia) => dia.fecha.slice(0, 7) === ym);
  const jornadas = input.jornadas.filter((item) => item.fecha != null && item.fecha.slice(0, 7) === ym);
  const productivas = jornadas.reduce((suma, item) => suma + item.hsProductivas, 0);
  const paradas = jornadas.reduce((suma, item) => suma + item.hsParadasProg + item.hsParadasNo, 0);
  const finalizadas = productivas + paradas;
  const disponibles = dias.reduce((suma, dia) => suma + dia.disponibles, 0);
  const ultimaProduccion = jornadas.reduce<string | null>((mejor, item) => {
    const fecha = item.fecha as string;
    return !mejor || fecha > mejor ? fecha : mejor;
  }, null);
  const inicioPendiente = ultimaProduccion && sumarDias(ultimaProduccion, 1) > inicioMes ? sumarDias(ultimaProduccion, 1) : inicioMes;
  const fechaCorte = input.abiertas.reduce<string | null>((mejor, item) => {
    if (!item.fechaFin) return mejor;
    return !mejor || item.fechaFin > mejor ? item.fechaFin : mejor;
  }, null);
  const finPlan = fechaCorte ? (fechaCorte > finMes ? finMes : fechaCorte) : "";
  const planificadas = fechaCorte ? sumaRango(dias, inicioPendiente, finPlan) : 0;
  const inicioSinCalculado = fechaCorte ? sumarDias(finPlan, 1) : inicioPendiente;
  const inicioSin = inicioSinCalculado < inicioPendiente ? inicioPendiente : inicioSinCalculado;
  const sinPlanificar = sumaRango(dias, inicioSin, finMes);
  const pendientes = Math.max(0, disponibles - finalizadas);

  const abiertas = input.abiertas.filter((item) => coincide(item, input.categoria, input.producto, input.envase));
  const elaboradas = jornadas.filter((item) => coincide(item, input.categoria, input.producto, input.envase));
  const porEnvase = new Map<string, { elaborado: number; pendiente: number }>();
  for (const item of elaboradas) {
    const fila = porEnvase.get(item.envase) ?? { elaborado: 0, pendiente: 0 };
    fila.elaborado += item.kg;
    porEnvase.set(item.envase, fila);
  }
  for (const item of abiertas) {
    if (item.kg <= 0.0005) continue;
    const fila = porEnvase.get(item.envase) ?? { elaborado: 0, pendiente: 0 };
    fila.pendiente += item.kg;
    porEnvase.set(item.envase, fila);
  }
  const envases = [...porEnvase.entries()]
    .filter(([, fila]) => fila.elaborado > 0.0005 || fila.pendiente > 0.0005)
    .sort((a, b) => b[1].pendiente - a[1].pendiente || b[1].elaborado - a[1].elaborado || a[0].localeCompare(b[0], "es"))
    .map(([envase, fila]) => ({ envase, elaborado: fila.elaborado, pendiente: fila.pendiente }));

  const recetas = new Map<number, LineaRecetaResumen[]>();
  for (const linea of input.recetas) {
    const lista = recetas.get(linea.idVersion) ?? [];
    lista.push(linea);
    recetas.set(linea.idVersion, lista);
  }
  const ingredientes = new Map<number, { nombre: string; pendiente: number }>();
  const envasePend = new Map<string, { nombre: string; id: number | null; pendiente: number }>();
  const etiquetaPend = new Map<string, { nombre: string; id: number | null; pendiente: number }>();
  const insumoPend = new Map<string, number>();
  const usados = new Set(input.insumosUsados.map((item) => `${item.idSolicitud}|${clave(item.codigo)}`));
  for (const solicitud of abiertas) {
    if (solicitud.idVersion != null && solicitud.kg > 0.0005) {
      for (const linea of recetas.get(solicitud.idVersion) ?? []) {
        const cantidad = Math.max(0, linea.participacion * solicitud.kg);
        if (cantidad <= 0.0005) continue;
        const acum = ingredientes.get(linea.idIngrediente) ?? { nombre: linea.nombre, pendiente: 0 };
        acum.pendiente += cantidad;
        ingredientes.set(linea.idIngrediente, acum);
      }
    }
    if (solicitud.unidades > 0.0005 && solicitud.envase) {
      const claveFila = String(solicitud.idEnvase ?? clave(solicitud.envase));
      const acum = envasePend.get(claveFila) ?? { nombre: solicitud.envase, id: solicitud.idEnvase, pendiente: 0 };
      acum.pendiente += solicitud.unidades;
      envasePend.set(claveFila, acum);
    }
    if (solicitud.unidades > 0.0005 && solicitud.etiqueta && solicitud.etiqueta !== "Sin etiqueta") {
      const claveFila = String(solicitud.idEtiqueta ?? clave(solicitud.etiqueta));
      const acum = etiquetaPend.get(claveFila) ?? { nombre: solicitud.etiqueta, id: solicitud.idEtiqueta, pendiente: 0 };
      acum.pendiente += solicitud.unidades;
      etiquetaPend.set(claveFila, acum);
    }
    if (solicitud.pallets > 0.0005) {
      for (const insumo of INSUMOS) {
        if (!insumo.siempre && !usados.has(`${solicitud.id}|${clave(insumo.codigo)}`)) continue;
        insumoPend.set(insumo.codigo, (insumoPend.get(insumo.codigo) ?? 0) + solicitud.pallets);
      }
    }
  }

  const nombreInsumo = (codigo: string) => {
    const grupo = input.stock.articulos.find((item) => item.familia === "insumos");
    return grupo?.items.find((item) => clave(item.codigo) === clave(codigo))?.nombre || codigo;
  };
  const ordenar = (filas: FilaConsumoResumen[]) =>
    filas.sort((a, b) => b.pendiente - a.pendiente || a.nombre.localeCompare(b.nombre, "es"));

  const consumos: GrupoConsumo[] = [
    {
      titulo: "Ingredientes",
      filas: ordenar(
        [...ingredientes.entries()]
          .filter(([, item]) => item.pendiente > 0.0005)
          .map(([id, item]) => filaConsumo(item.nombre, "kg", item.pendiente, stockDe(input.stock, "ingredientes", id))),
      ),
    },
    {
      titulo: "Insumos",
      filas: ordenar(
        [...insumoPend.entries()]
          .filter(([, pendiente]) => pendiente > 0.0005)
          .map(([codigo, pendiente]) =>
            filaConsumo(nombreInsumo(codigo), "un", pendiente, stockDe(input.stock, "insumos", null, codigo)),
          ),
      ),
    },
    {
      titulo: "Envases",
      filas: ordenar(
        [...envasePend.values()]
          .filter((item) => item.pendiente > 0.0005)
          .map((item) => filaConsumo(item.nombre, "un", item.pendiente, stockDe(input.stock, "envases", item.id))),
      ),
    },
    {
      titulo: "Etiquetas",
      filas: ordenar(
        [...etiquetaPend.values()]
          .filter((item) => item.pendiente > 0.0005)
          .map((item) => filaConsumo(item.nombre, "un", item.pendiente, stockDe(input.stock, "etiquetas", item.id))),
      ),
    },
  ];

  const etiqueta = etiquetaMes(inicioMes).toUpperCase();
  let notaHoras = ultimaProduccion
    ? `Última producción registrada: ${fechaVisible(ultimaProduccion)}.`
    : "En este mes no hay producción registrada.";
  if (fechaCorte) {
    notaHoras += ` Fecha fin más lejana de las solicitudes abiertas: ${fechaVisible(fechaCorte)}.`;
    if (planificadas > 0.0005) {
      notaHoras += ` Planificadas: ${fechaVisible(inicioPendiente)} al ${fechaVisible(finPlan)}.`;
    }
    if (sinPlanificar > 0.0005) {
      notaHoras += ` Sin planificar: ${fechaVisible(inicioSin)} al ${fechaVisible(finMes)}.`;
    }
  } else {
    notaHoras += " No hay una fecha de finalización en las solicitudes abiertas, así que las horas que faltan quedan sin planificar.";
  }

  return {
    etiqueta,
    desde: inicioMes,
    hasta: ultimaProduccion && ultimaProduccion >= inicioMes && ultimaProduccion <= finMes ? ultimaProduccion : finMes,
    ultimaProduccion,
    fechaCorte,
    disponibles: r1(disponibles),
    finalizadas: r1(finalizadas),
    productivas: r1(productivas),
    paradas: r1(paradas),
    pendientes: r1(pendientes),
    planificadas: r1(planificadas),
    sinPlanificar: r1(sinPlanificar),
    notaHoras,
    envases,
    consumos,
  };
}

export function textoCantidad(fila: FilaConsumoResumen) {
  return fila.unidad === "kg" ? fmtKg(fila.pendiente) : `${fmtKg(fila.pendiente).replace(" kg", "")} un.`;
}

export function textoStock(fila: FilaConsumoResumen, campo: "stock" | "faltante" | "sobrante") {
  const valor = fila[campo];
  return fila.unidad === "kg" ? fmtKg(valor) : `${fmtKg(valor).replace(" kg", "")} un.`;
}

export { fmtHs };
