import { lineaEmision } from "@/lib/informes/emision";
import { CATALOGOS } from "@/lib/catalogos/logic";
import { fechaVisible } from "@/lib/solicitudes/logic";
import {
  etiquetaPeriodo,
  fmtHs,
  fmtKg,
  fmtKgH,
  fmtPct,
  type ResumenAnalytics,
  type ResumenPlanAnalytics,
} from "@/lib/analytics/logic";
import {
  FAMILIAS_STOCK,
  resumenStock,
  type DatosStockAnalytics,
  type FamiliaStock,
} from "@/lib/analytics/stock";
import type { HallazgoTrazabilidad } from "@/lib/analytics/trazabilidad";

const PDF_DETALLE = 80;

export type FiltrosExportAnalytics = {
  tab: "produccion" | "stock";
  desde: string;
  hasta: string;
  categoria: string;
  producto: string;
  envase: string;
  causa: { nombre: string; tipo: "prog" | "no" } | null;
  familia: FamiliaStock;
  comparar: boolean;
};

export type InformeAnalytics = {
  titulo: string;
  nombreInicial: string;
  hoja: string;
  encabezados: string[];
  filas: (string | number | null)[][];
  filasPdf: (string | number | null)[][];
};

type Fila = (string | number | null)[];

function fila(
  seccion: string,
  campo: string,
  valor: string | number | null = "",
  detalle: string | number | null = "",
  extra: string | number | null = "",
): Fila {
  return [seccion, campo, valor, detalle, extra];
}

function fmtDelta(actual: number, anterior: number | undefined) {
  if (anterior == null) return "";
  if (anterior <= 0.0005) return "Sin dato anterior";
  const pct = ((actual - anterior) / anterior) * 100;
  return `vs ant. ${pct > 0.05 ? "+" : ""}${fmtPct(pct)}`;
}

function fmtCant(valor: number, unidad: string) {
  if (unidad === "kg") return fmtKg(valor);
  const n = Number(valor) || 0;
  const txt =
    Math.abs(n - Math.round(n)) < 0.05
      ? Math.round(n).toLocaleString("es-AR")
      : n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${txt} ${unidad}`;
}

function etiquetaFamilia(familia: FamiliaStock) {
  return FAMILIAS_STOCK.find((item) => item.id === familia)?.label ?? familia;
}

function recortarDetalle(filas: Fila[], seccion: string, tope: number) {
  const detalle = filas.filter((item) => item[0] === seccion);
  if (detalle.length <= tope) return filas;
  const resto = filas.filter((item) => item[0] !== seccion);
  return [
    ...resto,
    ...detalle.slice(0, tope),
    fila(seccion, "Recorte PDF", `${tope} de ${detalle.length}`, "El Excel incluye el recorte completo"),
  ];
}

function filtros(input: FiltrosExportAnalytics): Fila[] {
  const out = [
    fila("Filtros", "Período", etiquetaPeriodo(input.desde, input.hasta)),
    fila("Filtros", "Vista", input.tab === "stock" ? "Stock" : "Producción"),
    fila("Filtros", "Categoría", input.categoria),
    fila("Filtros", "Producto", input.producto),
  ];
  if (input.tab === "produccion") {
    out.push(fila("Filtros", "Envase", input.envase));
    if (input.causa) {
      out.push(
        fila(
          "Filtros",
          "Causa",
          input.causa.nombre,
          input.causa.tipo === "prog" ? "Programada" : "No programada",
        ),
      );
    }
  } else {
    out.push(fila("Filtros", "Familia", etiquetaFamilia(input.familia)));
  }
  out.push(fila("Emisión", "Informe", lineaEmision()));
  return out;
}

function filasProduccion(
  resumen: ResumenAnalytics,
  plan: ResumenPlanAnalytics | null,
  anterior: ResumenAnalytics | null,
  comparar: boolean,
): Fila[] {
  const d = (actual: number, getter: (r: ResumenAnalytics) => number) =>
    comparar ? fmtDelta(actual, anterior ? getter(anterior) : undefined) : "";
  const out: Fila[] = [
    fila("KPI", "Jornadas", resumen.jornadas, `${resumen.diasConRegistro} días con registro`),
    fila("KPI", "Producción total", fmtKg(resumen.kgTotal), d(resumen.kgTotal, (r) => r.kgTotal)),
    fila("KPI", "Promedio diario", fmtKg(resumen.kgPromedioDia), d(resumen.kgPromedioDia, (r) => r.kgPromedioDia)),
    fila("KPI", "Rendimiento", fmtKgH(resumen.kgHora), d(resumen.kgHora, (r) => r.kgHora)),
    fila("KPI", "Horas productivas", fmtHs(resumen.hsProductivas), `Promedio diario: ${fmtHs(resumen.hsProductivasDia)}`, d(resumen.hsProductivas, (r) => r.hsProductivas)),
    fila("KPI", "Horas disponibles", fmtHs(resumen.hsDisponibles), `Promedio diario: ${fmtHs(resumen.hsDisponiblesDia)}`),
    fila("KPI", "Paradas programadas", fmtHs(resumen.hsParadasProg), `Promedio diario: ${fmtHs(resumen.hsParadasProgDia)}`, d(resumen.hsParadasProg, (r) => r.hsParadasProg)),
    fila("KPI", "Paradas no programadas", fmtHs(resumen.hsParadasNo), `Promedio diario: ${fmtHs(resumen.hsParadasNoDia)}`, d(resumen.hsParadasNo, (r) => r.hsParadasNo)),
    fila("KPI", "Utilización", fmtPct(resumen.utilizacionPct), "Horas productivas / horas disponibles", d(resumen.utilizacionPct, (r) => r.utilizacionPct)),
  ];
  if (plan) {
    out.push(
      fila(
        "KPI",
        "Cumplimiento del plan",
        plan.cumplimiento == null ? "—" : fmtPct(plan.cumplimiento),
        plan.cumplimiento == null
          ? "Sin kg planificados vigentes"
          : `Real ${fmtKg(plan.kgReal)} · Plan vigente ${fmtKg(plan.kgPlanVigente)}`,
      ),
    );
  }
  if (comparar && anterior) {
    out.push(fila("Comparación", "Período anterior", etiquetaPeriodo(anterior.desde, anterior.hasta)));
  }

  for (const punto of resumen.serie) {
    out.push(
      fila(
        "Serie",
        punto.etiqueta,
        fmtKg(punto.kg),
        `${fmtHs(punto.hsProductivas)} prod.`,
        `${punto.jornadas} jornadas`,
      ),
    );
  }
  for (const parte of resumen.porCategoria) {
    out.push(fila("Categoría", parte.nombre, fmtKg(parte.valor), fmtPct(parte.porcentaje)));
  }
  for (const parte of resumen.porEnvase) {
    out.push(fila("Envase", parte.nombre, fmtKg(parte.valor), fmtPct(parte.porcentaje)));
  }
  for (const parte of resumen.promedioCategoria) {
    out.push(fila("Promedio diario", parte.nombre, `${fmtKg(parte.valor)}/día`, fmtPct(parte.porcentaje)));
  }
  if (plan?.tienePlan) {
    for (const punto of plan.serie) {
      out.push(fila("Plan vs real", punto.etiqueta, `Real ${fmtKg(punto.kgReal)}`, `Plan ${fmtKg(punto.kgPlan)}`));
    }
  }
  for (const parte of resumen.causasProgramadas) {
    out.push(fila("Causa programada", parte.nombre, fmtHs(parte.valor), fmtPct(parte.porcentaje)));
  }
  for (const parte of resumen.causasNoProgramadas) {
    out.push(fila("Causa no programada", parte.nombre, fmtHs(parte.valor), fmtPct(parte.porcentaje)));
  }
  for (const jornada of resumen.detalle) {
    out.push(
      fila(
        "Jornada",
        fechaVisible(jornada.fecha),
        jornada.producto,
        `${fmtKg(jornada.kg)} · ${fmtHs(jornada.hsProductivas)}`,
        `${jornada.lote || "—"} · ${jornada.categoria}`,
      ),
    );
  }
  return out;
}

function filasStock(datos: DatosStockAnalytics, input: FiltrosExportAnalytics): Fila[] {
  const resumen = resumenStock(datos, {
    desde: input.desde,
    hasta: input.hasta,
    familia: input.familia,
    categoria: input.categoria,
    producto: input.producto,
  });
  const familiaKpi = input.familia === "Todas" ? "ingredientes" : input.familia;
  const unidad = CATALOGOS[familiaKpi].unidad;
  const etiquetaFam = input.familia === "Todas" ? "ingredientes" : CATALOGOS[input.familia].titulo.toLowerCase();
  const out: Fila[] = [
    fila("KPI", `Stock ${etiquetaFam}`, fmtCant(resumen.stockTotal, unidad), "Activos · ingresos − egresos − consumo"),
    fila("KPI", "Stock bajo", resumen.bajos, `Mínimo ${CATALOGOS[familiaKpi].stockMinimo}`),
    fila("KPI", "Lotes vencidos", resumen.vencidos, "Con saldo y vencimiento anterior a hoy"),
    fila("KPI", "Vencen en 30 días", resumen.proximos),
    fila("KPI", "Consumo del período", fmtCant(resumen.consumo, unidad), `Ingresos ${fmtCant(resumen.ingresos, unidad)} · Egresos ${fmtCant(resumen.egresos, unidad)}`),
    fila("KPI", "Barridos de línea", fmtKg(resumen.barridosKg), "Merma registrada en el período"),
  ];
  for (const parte of resumen.porFamiliaMov) {
    out.push(fila("Movimientos", parte.nombre, fmtCant(parte.valor, unidad), fmtPct(parte.porcentaje)));
  }
  for (const parte of resumen.topConsumo) {
    out.push(fila("Top consumo", parte.nombre, fmtCant(parte.valor, unidad), fmtPct(parte.porcentaje)));
  }
  for (const parte of resumen.topBarridos) {
    out.push(fila("Top barridos", parte.nombre, fmtKg(parte.valor), fmtPct(parte.porcentaje)));
  }
  for (const item of resumen.detalleVencimientos) {
    out.push(
      fila(
        "Vencimiento",
        item.estado === "vencido" ? "Vencido" : "Próximo",
        item.articulo,
        `${item.lote} · ${fmtCant(item.stock, CATALOGOS[item.familia].unidad)}`,
        fechaVisible(item.vencimiento),
      ),
    );
  }
  for (const item of resumen.detalleConsumo) {
    out.push(
      fila(
        "Consumo",
        fechaVisible(item.fecha),
        item.articulo,
        `${fmtCant(item.cantidad, CATALOGOS[item.familia].unidad)} · ${item.lote || "—"}`,
        `${item.producto} · ${item.loteProducto || "—"}`,
      ),
    );
  }
  for (const item of resumen.detalleBarridos) {
    out.push(
      fila(
        "Barrido",
        item.ingrediente,
        fmtKg(item.kg),
        item.producto,
        `${item.loteProducto || "—"} · sol. ${item.idSolicitud ?? "—"}`,
      ),
    );
  }
  return out;
}

export function armarInformeAnalytics(
  input: FiltrosExportAnalytics & {
    resumen: ResumenAnalytics | null;
    plan: ResumenPlanAnalytics | null;
    anterior: ResumenAnalytics | null;
    stock: DatosStockAnalytics;
  },
): InformeAnalytics | null {
  if (!input.desde || !input.hasta) return null;
  if (input.tab === "produccion" && !input.resumen) return null;

  const cuerpo =
    input.tab === "stock"
      ? filasStock(input.stock, input)
      : filasProduccion(input.resumen!, input.plan, input.anterior, input.comparar);
  const filas = [...filtros(input), ...cuerpo];
  const titulo = input.tab === "stock" ? "Data Analytics · Stock" : "Data Analytics · Producción";
  const hoja = input.tab === "stock" ? "Stock" : "Produccion";
  const nombreInicial = `analytics_${input.tab}_${input.desde}_${input.hasta}`;
  const filasPdf =
    input.tab === "stock"
      ? recortarDetalle(recortarDetalle(filas, "Consumo", PDF_DETALLE), "Vencimiento", PDF_DETALLE)
      : recortarDetalle(filas, "Jornada", PDF_DETALLE);

  return {
    titulo,
    nombreInicial,
    hoja,
    encabezados: ["Sección", "Campo", "Valor", "Detalle", "Extra"],
    filas,
    filasPdf,
  };
}

export function armarInformeTrazabilidad(consulta: string, hallazgos: HallazgoTrazabilidad[]): InformeAnalytics {
  const filas: Fila[] = [
    fila("Filtros", "Búsqueda", consulta.trim()),
    fila("Emisión", "Informe", lineaEmision()),
    fila("Resumen", "Coincidencias", hallazgos.length),
  ];
  for (const item of hallazgos) {
    filas.push(
      fila(
        item.tipo === "materia" ? "Lote MP" : "Lote producto",
        item.lote,
        item.titulo,
        item.detalle,
        `${item.jornadas.length} jornadas · ${item.consumos.length} consumos`,
      ),
    );
    for (const mov of item.movimientos) {
      filas.push(
        fila(
          "Movimiento",
          fechaVisible(mov.fecha),
          mov.tipo === "ingreso" ? "Ingreso" : "Egreso",
          mov.articulo,
          fmtCant(mov.cantidad, CATALOGOS[mov.familia].unidad),
        ),
      );
    }
    for (const cons of item.consumos) {
      filas.push(
        fila(
          "Consumo",
          fechaVisible(cons.fecha),
          cons.articulo,
          fmtCant(cons.cantidad, CATALOGOS[cons.familia].unidad),
          `${cons.producto} · ${cons.loteProducto || "—"} · sol. ${cons.idSolicitud ?? "—"}`,
        ),
      );
    }
    for (const jornada of item.jornadas) {
      filas.push(
        fila(
          "Jornada",
          fechaVisible(jornada.fecha),
          jornada.producto,
          `${fmtKg(jornada.kg)} · ${fmtHs(jornada.hsProductivas)}`,
          `${jornada.lote || "—"} · OP ${jornada.ordenProduccion || "—"}`,
        ),
      );
    }
    for (const barrido of item.barridos) {
      filas.push(fila("Barrido", barrido.ingrediente, fmtKg(barrido.kg), barrido.producto, barrido.loteProducto || "—"));
    }
  }
  return {
    titulo: "Data Analytics · Trazabilidad",
    nombreInicial: `analytics_trazabilidad_${consulta.trim() || "busqueda"}`,
    hoja: "Trazabilidad",
    encabezados: ["Sección", "Campo", "Valor", "Detalle", "Extra"],
    filas,
    filasPdf: recortarDetalle(filas, "Consumo", PDF_DETALLE),
  };
}
