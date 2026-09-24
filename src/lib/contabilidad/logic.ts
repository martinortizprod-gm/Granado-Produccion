import {
  MOVIMIENTOS,
  type KindMovimiento,
  type MovimientoVista,
} from "@/lib/movimientos/logic";
import { aFecha, clave, idEntero, numero, texto } from "@/lib/solicitudes/logic";

export const ORIGENES_CONTABLES = [
  "ingredientes",
  "insumos",
  "envases",
  "etiquetas",
] as const satisfies readonly Exclude<KindMovimiento, "productos">[];

export type OrigenContable = (typeof ORIGENES_CONTABLES)[number];

export type EstadoFacturacion = "pendiente" | "abonada" | "cancelada";

export type Moneda = "ARS" | "USD";

export type CotizacionDolar = {
  pesos: number;
  fecha: string;
};

export type FormaPago = {
  id: number;
  forma_de_pago: string;
};

export type PagoContable = {
  id: number;
  id_forma_pago: number | null;
  forma: string;
  monto: number;
  moneda: Moneda;
};

export type FichaContable = {
  id: number;
  tabla_origen: string;
  id_movimiento: number;
  id_usuario_registro: number;
  fecha_hora_registro: string;
  id_usuario_ultima_actualizacion: number | null;
  fecha_hora_ultima_actualizacion: string | null;
  numero_factura: string;
  vencimiento_facturacion: string;
  comprobante_remito: string;
  comprobante_factura: string;
  costo_sin_iva: number | null;
  costo_iva: number | null;
  monto_abonado: number | null;
  id_forma_pago: number | null;
  estado_facturacion: EstadoFacturacion;
  observaciones: string;
  impacta: boolean;
  moneda: Moneda;
};

export type FilaIngresoContable = {
  clave: string;
  kind: OrigenContable;
  tabla: string;
  tipoArticulo: string;
  movimiento: MovimientoVista;
  ficha: FichaContable | null;
  pagos: PagoContable[];
  impacta: boolean;
  monedaCosto: Moneda;
  montoAbonado: number | null;
  formaPago: string;
  costoTotalPesos: number | null;
  montoAbonadoPesos: number | null;
  montoPendientePesos: number | null;
  usuarioRegistro: string;
  usuarioActualizacion: string;
  costoTotal: number | null;
  montoPendiente: number | null;
  estado: EstadoFacturacion;
};

export function costoTotal(sinIva: number | null, iva: number | null): number | null {
  if (sinIva == null && iva == null) return null;
  return Math.round(((sinIva ?? 0) + (iva ?? 0)) * 100) / 100;
}

export function montoPendiente(total: number | null, abonado: number | null): number | null {
  if (total == null) return null;
  return Math.round((total - (abonado ?? 0)) * 100) / 100;
}

export function estadoVisible(
  guardado: string | null,
  total: number | null,
  abonado: number | null,
): EstadoFacturacion {
  if (guardado === "cancelada") return "cancelada";
  if (total != null && total > 0 && (abonado ?? 0) + 0.001 >= total) return "abonada";
  return "pendiente";
}

export function etiquetaEstado(estado: EstadoFacturacion) {
  if (estado === "abonada") return "Abonada";
  if (estado === "cancelada") return "Cancelada";
  return "Pendiente";
}

export function plata(valor: number | null): string {
  if (valor == null || !Number.isFinite(valor)) return "—";
  return valor.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function monedaDe(valor: unknown): Moneda {
  return clave(valor) === "usd" ? "USD" : "ARS";
}

export function aPesos(monto: number | null, moneda: Moneda, cotizacion: number | null): number | null {
  if (monto == null) return null;
  if (moneda === "ARS") return monto;
  if (cotizacion == null || cotizacion <= 0) return null;
  return Math.round(monto * cotizacion * 100) / 100;
}

export function textoMoneda(valor: number | null, moneda: Moneda) {
  const n = plata(valor);
  if (n === "—") return n;
  return moneda === "USD" ? `USD ${n}` : `$ ${n}`;
}

export function textoEnPesos(pesos: number | null, original: number | null, moneda: Moneda) {
  if (pesos != null) {
    const n = plata(pesos);
    return n === "—" ? n : `$ ${n}`;
  }
  return textoMoneda(original, moneda);
}

export function importeONull(valor: string): number | null {
  const t = valor.trim();
  if (!t) return null;
  const n = numero(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function numeroONull(valor: unknown): number | null {
  if (valor == null || valor === "") return null;
  const n = numero(valor);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function estadoGuardado(valor: unknown): EstadoFacturacion {
  const n = clave(valor);
  if (n === "abonada" || n === "cancelada") return n;
  return "pendiente";
}

function leerFicha(fila: Record<string, unknown>): FichaContable | null {
  const id = idEntero(fila.id);
  const idMovimiento = idEntero(fila.id_movimiento);
  const tabla = texto(fila.tabla_origen);
  const idUsuario = idEntero(fila.id_usuario_registro);
  if (id == null || idMovimiento == null || !tabla || idUsuario == null) return null;
  return {
    id,
    tabla_origen: tabla,
    id_movimiento: idMovimiento,
    id_usuario_registro: idUsuario,
    fecha_hora_registro: texto(fila.fecha_hora_registro),
    id_usuario_ultima_actualizacion: idEntero(fila.id_usuario_ultima_actualizacion),
    fecha_hora_ultima_actualizacion: texto(fila.fecha_hora_ultima_actualizacion),
    numero_factura: texto(fila.numero_factura),
    vencimiento_facturacion: texto(fila.vencimiento_facturacion),
    comprobante_remito: texto(fila.comprobante_remito),
    comprobante_factura: texto(fila.comprobante_factura),
    costo_sin_iva: numeroONull(fila.costo_sin_iva),
    costo_iva: numeroONull(fila.costo_iva),
    monto_abonado: numeroONull(fila.monto_abonado),
    id_forma_pago: idEntero(fila.id_forma_pago),
    estado_facturacion: estadoGuardado(fila.estado_facturacion),
    observaciones: texto(fila.observaciones),
    impacta: fila.impacta !== false && clave(fila.impacta) !== "false",
    moneda: monedaDe(fila.moneda),
  };
}

function nombreUsuario(fila: Record<string, unknown> | undefined, id: number | null) {
  if (id == null) return "—";
  if (!fila) return String(id);
  const nombre = [texto(fila.nombre), texto(fila.apellido)].filter(Boolean).join(" ");
  return nombre || String(id);
}

function leerPago(fila: Record<string, unknown>, porForma: Map<number, string>): PagoContable | null {
  const id = idEntero(fila.id);
  const idForma = idEntero(fila.id_forma_pago);
  const monto = numeroONull(fila.monto);
  if (id == null || idForma == null || monto == null) return null;
  return {
    id,
    id_forma_pago: idForma,
    forma: porForma.get(idForma) || "—",
    monto,
    moneda: monedaDe(fila.moneda),
  };
}

export function armarFilasContables(input: {
  ingresos: { kind: OrigenContable; movimientos: MovimientoVista[] }[];
  fichas: Record<string, unknown>[];
  pagos: Record<string, unknown>[];
  formas: Record<string, unknown>[];
  usuarios: Record<string, unknown>[];
  cotizacion: number | null;
}): FilaIngresoContable[] {
  const porFicha = new Map<string, FichaContable>();
  for (const cruda of input.fichas) {
    const ficha = leerFicha(cruda);
    if (!ficha) continue;
    porFicha.set(`${ficha.tabla_origen}:${ficha.id_movimiento}`, ficha);
  }
  const porForma = new Map<number, string>();
  for (const fila of input.formas) {
    const id = idEntero(fila.id);
    const nombre = texto(fila.forma_de_pago);
    if (id == null || !nombre) continue;
    porForma.set(id, nombre);
  }
  const porUsuario = new Map<number, Record<string, unknown>>();
  for (const fila of input.usuarios) {
    const id = idEntero(fila.id);
    if (id != null) porUsuario.set(id, fila);
  }
  const pagosPorFicha = new Map<number, PagoContable[]>();
  for (const cruda of input.pagos) {
    const idContable = idEntero(cruda.id_contable);
    const pago = leerPago(cruda, porForma);
    if (idContable == null || !pago) continue;
    const lista = pagosPorFicha.get(idContable) ?? [];
    lista.push(pago);
    pagosPorFicha.set(idContable, lista);
  }
  for (const lista of pagosPorFicha.values()) {
    lista.sort((a, b) => a.id - b.id);
  }

  const filas: FilaIngresoContable[] = [];
  for (const pack of input.ingresos) {
    const cfg = MOVIMIENTOS[pack.kind];
    for (const movimiento of pack.movimientos) {
      if (movimiento.tipo !== "ingreso") continue;
      const ficha = porFicha.get(`${cfg.tabla}:${movimiento.id}`) ?? null;
      let pagos = ficha ? (pagosPorFicha.get(ficha.id) ?? []) : [];
      if (
        !pagos.length &&
        ficha &&
        (ficha.id_forma_pago != null || (ficha.monto_abonado != null && ficha.monto_abonado > 0))
      ) {
        pagos = [
          {
            id: 0,
            id_forma_pago: ficha.id_forma_pago,
            forma: ficha.id_forma_pago != null ? porForma.get(ficha.id_forma_pago) || "—" : "",
            monto: ficha.monto_abonado ?? 0,
            moneda: ficha.moneda,
          },
        ];
      }
      const monedaCosto = ficha?.moneda ?? "ARS";
      const montoAbonado = pagos.length
        ? Math.round(pagos.reduce((suma, p) => suma + p.monto, 0) * 100) / 100
        : (ficha?.monto_abonado ?? null);
      const total = costoTotal(ficha?.costo_sin_iva ?? null, ficha?.costo_iva ?? null);
      const costoTotalPesos = aPesos(total, monedaCosto, input.cotizacion);
      let montoAbonadoPesos: number | null = pagos.length ? 0 : aPesos(montoAbonado, monedaCosto, input.cotizacion);
      if (pagos.length) {
        let suma = 0;
        for (const pago of pagos) {
          const enPesos = aPesos(pago.monto, pago.moneda, input.cotizacion);
          if (enPesos == null) {
            montoAbonadoPesos = null;
            break;
          }
          suma += enPesos;
        }
        if (montoAbonadoPesos != null) montoAbonadoPesos = Math.round(suma * 100) / 100;
      }
      const pendientePesos = montoPendiente(costoTotalPesos, montoAbonadoPesos);
      const estado = estadoVisible(
        ficha?.estado_facturacion ?? null,
        costoTotalPesos,
        montoAbonadoPesos,
      );
      const formaPago = pagos.length
        ? pagos.map((p) => `${p.forma || "Sin forma"} ${textoMoneda(p.monto, p.moneda)}`).join(" · ")
        : "—";
      filas.push({
        clave: `${cfg.tabla}:${movimiento.id}`,
        kind: pack.kind,
        tabla: cfg.tabla,
        tipoArticulo: cfg.titulo,
        movimiento,
        ficha,
        pagos,
        impacta: ficha ? ficha.impacta : true,
        monedaCosto,
        montoAbonado,
        formaPago,
        costoTotalPesos,
        montoAbonadoPesos,
        montoPendientePesos: pendientePesos,
        usuarioRegistro: nombreUsuario(
          ficha ? porUsuario.get(ficha.id_usuario_registro) : undefined,
          ficha?.id_usuario_registro ?? null,
        ),
        usuarioActualizacion: nombreUsuario(
          ficha?.id_usuario_ultima_actualizacion != null
            ? porUsuario.get(ficha.id_usuario_ultima_actualizacion)
            : undefined,
          ficha?.id_usuario_ultima_actualizacion ?? null,
        ),
        costoTotal: total,
        montoPendiente: pendientePesos,
        estado,
      });
    }
  }
  filas.sort((a, b) => {
    const fa = aFecha(a.movimiento.fecha_registro) ?? "";
    const fb = aFecha(b.movimiento.fecha_registro) ?? "";
    if (fa !== fb) return fb.localeCompare(fa);
    if (a.tabla !== b.tabla) return a.tabla.localeCompare(b.tabla, "es");
    return b.movimiento.id - a.movimiento.id;
  });
  return filas;
}

export function formasPago(filas: Record<string, unknown>[]): FormaPago[] {
  const lista: FormaPago[] = [];
  for (const fila of filas) {
    const id = idEntero(fila.id);
    const forma = texto(fila.forma_de_pago);
    if (id == null || !forma) continue;
    lista.push({ id, forma_de_pago: forma });
  }
  lista.sort((a, b) => a.id - b.id);
  return lista;
}
