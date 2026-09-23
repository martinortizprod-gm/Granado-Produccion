import { clave, idEntero } from "@/lib/solicitudes/logic";
import type { JornadaAnalytics } from "@/lib/analytics/logic";
import type {
  BarridoStock,
  ConsumoStock,
  DatosStockAnalytics,
  MovimientoStock,
} from "@/lib/analytics/stock";

export type HallazgoTrazabilidad = {
  clave: string;
  tipo: "materia" | "producto";
  lote: string;
  titulo: string;
  detalle: string;
  movimientos: MovimientoStock[];
  consumos: ConsumoStock[];
  jornadas: JornadaAnalytics[];
  barridos: BarridoStock[];
};

function toca(valor: string, q: string) {
  const c = clave(valor);
  return c.length > 0 && (c === q || c.includes(q));
}

function idsDe(items: { idSolicitud: number | null }[]) {
  const ids = new Set<number>();
  for (const item of items) {
    if (item.idSolicitud != null) ids.add(item.idSolicitud);
  }
  return ids;
}

export function buscarTrazabilidad(
  consulta: string,
  jornadas: JornadaAnalytics[],
  stock: DatosStockAnalytics,
): HallazgoTrazabilidad[] {
  const crudo = consulta.trim();
  const q = clave(crudo);
  if (q.length < 2) return [];
  const idBuscado = idEntero(crudo);

  const lotesMp = new Map<string, string>();
  const lotesProd = new Map<string, string>();
  const idsSol = new Set<number>();

  for (const mov of stock.movimientos) {
    if (toca(mov.lote, q)) lotesMp.set(clave(mov.lote), mov.lote);
  }
  for (const cons of stock.consumos) {
    if (toca(cons.lote, q)) lotesMp.set(clave(cons.lote), cons.lote);
    if (toca(cons.loteProducto, q)) lotesProd.set(clave(cons.loteProducto), cons.loteProducto);
    if (cons.idSolicitud != null && (cons.idSolicitud === idBuscado || toca(String(cons.idSolicitud), q))) {
      idsSol.add(cons.idSolicitud);
    }
  }
  for (const jornada of jornadas) {
    if (toca(jornada.lote, q)) lotesProd.set(clave(jornada.lote), jornada.lote);
    if (toca(jornada.ordenProduccion, q) && jornada.idSolicitud != null) idsSol.add(jornada.idSolicitud);
    if (jornada.idSolicitud != null && jornada.idSolicitud === idBuscado) idsSol.add(jornada.idSolicitud);
  }
  for (const barrido of stock.barridos) {
    if (toca(barrido.loteProducto, q)) lotesProd.set(clave(barrido.loteProducto), barrido.loteProducto);
    if (barrido.idSolicitud != null && barrido.idSolicitud === idBuscado) idsSol.add(barrido.idSolicitud);
  }

  for (const id of idsSol) {
    const jornada = jornadas.find((item) => item.idSolicitud === id && item.lote);
    if (jornada?.lote) lotesProd.set(clave(jornada.lote), jornada.lote);
    const cons = stock.consumos.find((item) => item.idSolicitud === id && item.loteProducto);
    if (cons?.loteProducto) lotesProd.set(clave(cons.loteProducto), cons.loteProducto);
  }

  const hallazgos: HallazgoTrazabilidad[] = [];

  for (const [k, lote] of lotesMp) {
    const movimientos = stock.movimientos.filter((item) => clave(item.lote) === k);
    const consumos = stock.consumos.filter((item) => clave(item.lote) === k);
    const sols = idsDe(consumos);
    const jornadasLote = jornadas.filter((item) => item.idSolicitud != null && sols.has(item.idSolicitud));
    const barridos = stock.barridos.filter((item) => item.idSolicitud != null && sols.has(item.idSolicitud));
    const articulo = movimientos[0]?.articulo || consumos[0]?.articulo || lote;
    const productos = [...new Set(consumos.map((item) => item.producto).filter(Boolean))];
    hallazgos.push({
      clave: `mp:${k}`,
      tipo: "materia",
      lote,
      titulo: articulo,
      detalle: productos.length ? productos.slice(0, 3).join(" · ") : "Sin consumo registrado",
      movimientos,
      consumos,
      jornadas: jornadasLote,
      barridos,
    });
  }

  for (const [k, lote] of lotesProd) {
    const jornadasLote = jornadas.filter((item) => clave(item.lote) === k);
    const sols = new Set<number>();
    for (const jornada of jornadasLote) {
      if (jornada.idSolicitud != null) sols.add(jornada.idSolicitud);
    }
    for (const cons of stock.consumos) {
      if (clave(cons.loteProducto) === k && cons.idSolicitud != null) sols.add(cons.idSolicitud);
    }
    const consumos = stock.consumos.filter((item) => item.idSolicitud != null && sols.has(item.idSolicitud));
    const barridos = stock.barridos.filter((item) => item.idSolicitud != null && sols.has(item.idSolicitud));
    const producto = jornadasLote[0]?.producto || consumos[0]?.producto || lote;
    const categoria = jornadasLote[0]?.categoria || consumos[0]?.categoria || "";
    hallazgos.push({
      clave: `prod:${k}`,
      tipo: "producto",
      lote,
      titulo: producto,
      detalle: [categoria, jornadasLote[0]?.ordenProduccion].filter(Boolean).join(" · ") || "Lote de producto",
      movimientos: [],
      consumos,
      jornadas: jornadasLote.length ? jornadasLote : jornadas.filter((item) => item.idSolicitud != null && sols.has(item.idSolicitud)),
      barridos,
    });
  }

  hallazgos.sort((a, b) => {
    const exactaA = clave(a.lote) === q ? 0 : 1;
    const exactaB = clave(b.lote) === q ? 0 : 1;
    if (exactaA !== exactaB) return exactaA - exactaB;
    if (a.tipo !== b.tipo) return a.tipo === "producto" ? -1 : 1;
    return clave(a.lote).localeCompare(clave(b.lote));
  });
  return hallazgos.slice(0, 8);
}
