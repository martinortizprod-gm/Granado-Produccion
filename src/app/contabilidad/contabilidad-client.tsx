"use client";

import { ColumnPicker } from "@/components/ui/column-picker";
import { IconDollar, IconPlus, IconSearch } from "@/components/ui/icons";
import {
  DetalleFilas,
  RecordDetailDrawer,
  RowDeleteButton,
  RowDetailButton,
  RowEditButton,
} from "@/components/ui/record-detail";
import { ColDef, useColumnVisibility } from "@/components/ui/use-column-visibility";
import {
  abrirComprobante,
  actualizarDolar,
  eliminarContable,
  guardarContable,
  marcarImpacto,
} from "@/app/contabilidad/actions";
import {
  aPesos,
  costoTotal,
  etiquetaEstado,
  estadoVisible,
  importeONull,
  montoPendiente,
  plata,
  textoEnPesos,
  textoMoneda,
  type CotizacionDolar,
  type EstadoFacturacion,
  type FilaIngresoContable,
  type FormaPago,
  type Moneda,
  type OrigenContable,
} from "@/lib/contabilidad/logic";
import { MOVIMIENTOS } from "@/lib/movimientos/logic";
import { aFecha, clave, fechaVisible, nroVisible } from "@/lib/solicitudes/logic";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

const COLS: ColDef[] = [
  { id: "fecha", label: "Fecha del movimiento" },
  { id: "articulo", label: "Artículo" },
  { id: "remito", label: "Remito" },
  { id: "costo_total", label: "Costo total" },
  { id: "monto_abonado", label: "Monto abonado" },
  { id: "monto_pendiente", label: "Monto pendiente" },
  { id: "impacto", label: "Impacto" },
  { id: "origen", label: "Tipo de artículo" },
  { id: "codigo", label: "Código" },
  { id: "lote", label: "Lote" },
  { id: "cantidad", label: "Cantidad" },
  { id: "proveedor", label: "Proveedor" },
  { id: "vencimiento_articulo", label: "Vencimiento del artículo" },
  { id: "categoria", label: "Categoría" },
  { id: "gestion", label: "Gestión" },
  { id: "observaciones_mov", label: "Observaciones del movimiento" },
  { id: "numero_factura", label: "Nº de factura" },
  { id: "vencimiento_facturacion", label: "Vencimiento de facturación" },
  { id: "costo_sin_iva", label: "Costo sin IVA" },
  { id: "costo_iva", label: "IVA" },
  { id: "forma_pago", label: "Forma de pago" },
  { id: "estado", label: "Estado de facturación" },
  { id: "observaciones", label: "Observaciones contables" },
  { id: "usuario_registro", label: "Usuario que registró" },
  { id: "actualizacion", label: "Última actualización" },
];

const VISIBLES_INICIO = new Set([
  "fecha",
  "articulo",
  "remito",
  "costo_total",
  "monto_abonado",
  "monto_pendiente",
  "impacto",
]);

const DEFAULT_OCULTAS = COLS.filter((c) => !VISIBLES_INICIO.has(c.id)).map((c) => c.id);

const DINERO = new Set([
  "costo_total",
  "monto_abonado",
  "monto_pendiente",
  "costo_sin_iva",
  "costo_iva",
]);

const SUBMODULOS: OrigenContable[] = ["ingredientes", "envases", "etiquetas", "insumos"];

function isoLocal(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function rangoPeriodo(periodo: string) {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  if (periodo === "mes-anterior") {
    return { desde: isoLocal(new Date(y, m - 1, 1)), hasta: isoLocal(new Date(y, m, 0)) };
  }
  if (periodo === "este-anio") {
    return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
  }
  if (periodo === "todo") return { desde: "", hasta: "" };
  return { desde: isoLocal(new Date(y, m, 1)), hasta: isoLocal(new Date(y, m + 1, 0)) };
}

type LineaPago = {
  clave: string;
  id_forma_pago: string;
  moneda: Moneda;
  monto: string;
};

function claveLinea() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lineaVacia(): LineaPago {
  return { clave: claveLinea(), id_forma_pago: "", moneda: "ARS", monto: "" };
}

type Borrador = {
  numero_factura: string;
  vencimiento_facturacion: string;
  costo_sin_iva: string;
  costo_iva: string;
  moneda: Moneda;
  impacta: boolean;
  pagos: LineaPago[];
  cancelada: boolean;
  observaciones: string;
  quitarRemito: boolean;
  quitarFactura: boolean;
  archivoRemito: File | null;
  archivoFactura: File | null;
};

function importeInput(valor: number | null) {
  if (valor == null) return "";
  return String(valor).replace(".", ",");
}

function fechaHoraVisible(valor: string) {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function claseEstado(estado: EstadoFacturacion) {
  if (estado === "abonada") return "g-badge g-badge-success";
  if (estado === "cancelada") return "g-badge g-badge-neutral";
  return "g-badge g-badge-warning";
}

function desde(fila: FilaIngresoContable): Borrador {
  const f = fila.ficha;
  return {
    numero_factura: f?.numero_factura ?? "",
    vencimiento_facturacion: aFecha(f?.vencimiento_facturacion) ?? "",
    costo_sin_iva: importeInput(f?.costo_sin_iva ?? null),
    costo_iva: importeInput(f?.costo_iva ?? null),
    moneda: fila.monedaCosto,
    impacta: fila.impacta,
    pagos: fila.pagos.length
      ? fila.pagos.map((p) => ({
          clave: p.id ? String(p.id) : claveLinea(),
          id_forma_pago: p.id_forma_pago != null ? String(p.id_forma_pago) : "",
          moneda: p.moneda,
          monto: importeInput(p.monto),
        }))
      : [lineaVacia()],
    cancelada: fila.estado === "cancelada",
    observaciones: f?.observaciones ?? "",
    quitarRemito: false,
    quitarFactura: false,
    archivoRemito: null,
    archivoFactura: null,
  };
}

function textoCol(id: string, fila: FilaIngresoContable) {
  const m = fila.movimiento;
  const f = fila.ficha;
  switch (id) {
    case "fecha":
      return fechaVisible(aFecha(m.fecha_registro));
    case "articulo":
      return m.nombre || "—";
    case "remito":
      return m.remito || "—";
    case "costo_total":
      return textoEnPesos(fila.costoTotalPesos, fila.costoTotal, fila.monedaCosto);
    case "monto_abonado":
      return textoEnPesos(fila.montoAbonadoPesos, null, "ARS");
    case "monto_pendiente":
      return textoEnPesos(fila.montoPendientePesos, null, "ARS");
    case "impacto":
      return fila.impacta ? "Impacta" : "No impacta";
    case "origen":
      return fila.tipoArticulo;
    case "codigo":
      return m.codigo || "—";
    case "lote":
      return m.lote || "—";
    case "cantidad":
      return `${nroVisible(m.cantidad, 3)} ${m.unidad}`;
    case "proveedor":
      return m.proveedor || "—";
    case "vencimiento_articulo":
      return fechaVisible(aFecha(m.fecha_vencimiento));
    case "categoria":
      return m.categoria || "—";
    case "gestion":
      return m.gestion || "—";
    case "observaciones_mov":
      return m.observaciones || "—";
    case "numero_factura":
      return f?.numero_factura || "—";
    case "vencimiento_facturacion":
      return fechaVisible(aFecha(f?.vencimiento_facturacion));
    case "costo_sin_iva":
      return plata(f?.costo_sin_iva ?? null);
    case "costo_iva":
      return plata(f?.costo_iva ?? null);
    case "forma_pago":
      return fila.formaPago;
    case "estado":
      return etiquetaEstado(fila.estado);
    case "observaciones":
      return f?.observaciones || "—";
    case "usuario_registro":
      return fila.ficha ? fila.usuarioRegistro : "—";
    case "actualizacion":
      return f?.fecha_hora_ultima_actualizacion
        ? `${fila.usuarioActualizacion} · ${fechaHoraVisible(f.fecha_hora_ultima_actualizacion)}`
        : "—";
    default:
      return "—";
  }
}

export function ContabilidadClient({
  filas,
  formas,
  cotizacion,
  errorMovimientos,
  errorContable,
  puedeEditar,
}: {
  filas: FilaIngresoContable[];
  formas: FormaPago[];
  cotizacion: CotizacionDolar | null;
  errorMovimientos: string | null;
  errorContable: string | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const cols = useColumnVisibility("contabilidad-ingresos", COLS, DEFAULT_OCULTAS);
  const mes = rangoPeriodo("este-mes");
  const [kind, setKind] = useState<OrigenContable>("ingredientes");
  const [periodo, setPeriodo] = useState("este-mes");
  const [desdeF, setDesdeF] = useState(mes.desde);
  const [hastaF, setHastaF] = useState(mes.hasta);
  const [estadoF, setEstadoF] = useState("Todos");
  const [impactoF, setImpactoF] = useState("impacta");
  const [busqueda, setBusqueda] = useState("");
  const [dolarAbierto, setDolarAbierto] = useState(false);
  const [dolarValor, setDolarValor] = useState("");
  const [detalleClave, setDetalleClave] = useState<string | null>(null);
  const [editClave, setEditClave] = useState<string | null>(null);
  const [form, setForm] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const q = clave(busqueda);
    return filas.filter((fila) => {
      if (fila.kind !== kind) return false;
      if (impactoF === "impacta" && !fila.impacta) return false;
      if (impactoF === "no" && fila.impacta) return false;
      const fecha = aFecha(fila.movimiento.fecha_registro);
      if (desdeF && (!fecha || fecha < desdeF)) return false;
      if (hastaF && (!fecha || fecha > hastaF)) return false;
      if (estadoF !== "Todos" && fila.estado !== clave(estadoF)) return false;
      if (!q) return true;
      const blob = clave(
        [
          fila.movimiento.nombre,
          fila.movimiento.codigo,
          fila.movimiento.remito,
          fila.movimiento.proveedor,
          fila.movimiento.lote,
          fila.ficha?.numero_factura,
          fila.formaPago,
        ].join(" "),
      );
      return blob.includes(q);
    });
  }, [filas, kind, impactoF, desdeF, hastaF, estadoF, busqueda]);

  const editando = filas.find((f) => f.clave === editClave) ?? null;
  const detalle = filas.find((f) => f.clave === detalleClave) ?? null;
  const visibles = COLS.filter((c) => cols.isVisible(c.id));

  const preview = form
    ? (() => {
        const sin = importeONull(form.costo_sin_iva);
        const iva = importeONull(form.costo_iva);
        const total = costoTotal(sin, iva);
        const tasa = cotizacion?.pesos ?? null;
        const totalPesos = aPesos(total, form.moneda, tasa);
        const lineas = form.pagos.filter((p) => p.monto.trim() || p.id_forma_pago);
        let abonadoPesos: number | null = 0;
        if (lineas.length) {
          let suma = 0;
          for (const linea of lineas) {
            const enPesos = aPesos(importeONull(linea.monto) ?? 0, linea.moneda, tasa);
            if (enPesos == null) {
              abonadoPesos = null;
              break;
            }
            suma += enPesos;
          }
          if (abonadoPesos != null) abonadoPesos = Math.round(suma * 100) / 100;
        }
        return {
          total,
          totalPesos,
          abonadoPesos,
          pendiente: montoPendiente(totalPesos, abonadoPesos),
          estado: estadoVisible(form.cancelada ? "cancelada" : null, totalPesos, abonadoPesos),
        };
      })()
    : null;

  function cambiarKind(siguiente: OrigenContable) {
    setKind(siguiente);
    const abierta = filas.find((f) => f.clave === editClave);
    if (abierta && abierta.kind !== siguiente) {
      setEditClave(null);
      setForm(null);
    }
    const vista = filas.find((f) => f.clave === detalleClave);
    if (vista && vista.kind !== siguiente) setDetalleClave(null);
  }

  function cambiarPeriodo(valor: string) {
    setPeriodo(valor);
    if (valor === "personalizado") return;
    const r = rangoPeriodo(valor);
    setDesdeF(r.desde);
    setHastaF(r.hasta);
  }

  function abrirEditar(fila: FilaIngresoContable) {
    setEditClave(fila.clave);
    setForm(desde(fila));
    setError(null);
  }

  function onGuardar(e: FormEvent) {
    e.preventDefault();
    if (!form || !editando) return;
    const fd = new FormData();
    fd.set("tabla_origen", editando.tabla);
    fd.set("id_movimiento", String(editando.movimiento.id));
    fd.set("numero_factura", form.numero_factura);
    fd.set("vencimiento_facturacion", form.vencimiento_facturacion);
    fd.set("costo_sin_iva", form.costo_sin_iva);
    fd.set("costo_iva", form.costo_iva);
    fd.set("moneda", form.moneda);
    fd.set("impacta", form.impacta ? "1" : "0");
    fd.set(
      "pagos_json",
      JSON.stringify(
        form.pagos
          .filter((p) => p.monto.trim() || p.id_forma_pago)
          .map((p) => ({ id_forma_pago: p.id_forma_pago, moneda: p.moneda, monto: p.monto })),
      ),
    );
    fd.set("cancelada", form.cancelada ? "1" : "0");
    fd.set("observaciones", form.observaciones);
    fd.set("quitar_remito", form.quitarRemito ? "1" : "0");
    fd.set("quitar_factura", form.quitarFactura ? "1" : "0");
    if (form.archivoRemito) fd.set("comprobante_remito", form.archivoRemito);
    if (form.archivoFactura) fd.set("comprobante_factura", form.archivoFactura);
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await guardarContable(fd);
        setAviso("Ficha contable guardada.");
        setForm(null);
        setEditClave(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function onEliminar(fila: FilaIngresoContable) {
    const nombre = fila.movimiento.nombre || fila.movimiento.codigo || `id ${fila.movimiento.id}`;
    if (
      !confirm(
        `¿Borrar la ficha contable de ${nombre}?\nEl ingreso de stock sigue en Movimientos.`,
      )
    ) {
      return;
    }
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await eliminarContable(fila.tabla, fila.movimiento.id);
        if (detalleClave === fila.clave) setDetalleClave(null);
        if (editClave === fila.clave) {
          setEditClave(null);
          setForm(null);
        }
        setAviso("Ficha contable eliminada.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar");
      }
    });
  }

  function onImpacto(fila: FilaIngresoContable, impacta: boolean) {
    if (fila.impacta === impacta) return;
    setError(null);
    setAviso(null);
    if (editClave === fila.clave) {
      setEditClave(null);
      setForm(null);
    }
    startTransition(async () => {
      try {
        await marcarImpacto(fila.tabla, fila.movimiento.id, impacta);
        setAviso(
          impacta
            ? "Quedó como Impacta."
            : "Quedó como No impacta y los costos pasaron a cero.",
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cambiar el impacto");
      }
    });
  }

  function onDolar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await actualizarDolar(dolarValor);
        setAviso("Cotización del dólar actualizada.");
        setDolarAbierto(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el dólar");
      }
    });
  }

  async function verArchivo(ruta: string) {
    setError(null);
    try {
      const url = await abrirComprobante(ruta);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el archivo");
    }
  }

  return (
    <div className="g-stack">
      {errorMovimientos ? <p className="g-alert g-alert-danger">{errorMovimientos}</p> : null}
      {errorContable ? <p className="g-alert g-alert-warning">{errorContable}</p> : null}
      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {aviso ? <p className="g-alert g-alert-success">{aviso}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="g-page-title">Contabilidad</h1>
          <p className="g-page-subtitle">
            Ingresos de ingredientes, insumos, envases y etiquetas. Por defecto se ven los que
            impactan. Los totales de la grilla están en pesos.
          </p>
        </div>
        <button
          type="button"
          className="g-btn g-btn-secondary"
          title="Cotización del dólar"
          onClick={() => {
            setDolarValor(cotizacion ? String(cotizacion.pesos).replace(".", ",") : "");
            setDolarAbierto((v) => !v);
          }}
        >
          <IconDollar className="h-4 w-4" />
          {cotizacion ? `$ ${plata(cotizacion.pesos)}` : "Dólar"}
        </button>
      </div>

      {dolarAbierto ? (
        <form className="g-card space-y-2 p-3" onSubmit={onDolar}>
          <p className="g-section-title">Cotización del dólar</p>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Pesos argentinos por 1 USD. Se usa para pasar a pesos los costos y pagos cargados en
            dólares.
            {cotizacion?.fecha
              ? ` Última actualización: ${fechaHoraVisible(cotizacion.fecha)}.`
              : " Todavía no hay un valor cargado."}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="g-label">Valor en pesos</span>
              <input
                className="g-input"
                inputMode="decimal"
                value={dolarValor}
                onChange={(e) => setDolarValor(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="g-btn g-btn-primary" disabled={pending || !puedeEditar}>
              Guardar cotización
            </button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {SUBMODULOS.map((k) => (
          <button
            key={k}
            type="button"
            className={k === kind ? "g-btn g-btn-primary" : "g-btn g-btn-secondary"}
            onClick={() => cambiarKind(k)}
          >
            {MOVIMIENTOS[k].titulo}
          </button>
        ))}
      </div>

      {form && editando && preview ? (
        <form key={editando.clave} className="g-card space-y-3 p-3" onSubmit={onGuardar}>
          <p className="g-section-title">
            Ficha contable · {editando.tipoArticulo} · {editando.movimiento.nombre || "Sin nombre"}
          </p>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Remito {editando.movimiento.remito || "—"} ·{" "}
            {fechaVisible(aFecha(editando.movimiento.fecha_registro))} ·{" "}
            {nroVisible(editando.movimiento.cantidad, 3)} {editando.movimiento.unidad}
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <label className="block">
              <span className="g-label">Impacto</span>
              <select
                className="g-input"
                value={form.impacta ? "impacta" : "no"}
                onChange={(e) => {
                  if (e.target.value === "no") {
                    setForm({
                      ...form,
                      impacta: false,
                      costo_sin_iva: "0",
                      costo_iva: "0",
                      pagos: form.pagos.map((p) =>
                        p.id_forma_pago || p.monto.trim() ? { ...p, monto: "0" } : p,
                      ),
                    });
                  } else {
                    setForm({ ...form, impacta: true });
                  }
                }}
              >
                <option value="impacta">Impacta</option>
                <option value="no">No impacta</option>
              </select>
            </label>
            <label className="block">
              <span className="g-label">Moneda del costo</span>
              <select
                className="g-input"
                value={form.moneda}
                disabled={!form.impacta}
                onChange={(e) => setForm({ ...form, moneda: e.target.value === "USD" ? "USD" : "ARS" })}
              >
                <option value="ARS">Peso argentino ($)</option>
                <option value="USD">Dólar estadounidense (USD)</option>
              </select>
            </label>
            <label className="block">
              <span className="g-label">Nº de factura</span>
              <input
                className="g-input"
                value={form.numero_factura}
                onChange={(e) => setForm({ ...form, numero_factura: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="g-label">Vencimiento de facturación</span>
              <input
                type="date"
                className="g-input"
                value={form.vencimiento_facturacion}
                onChange={(e) => setForm({ ...form, vencimiento_facturacion: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="g-label">Costo sin IVA</span>
              <input
                className="g-input"
                inputMode="decimal"
                value={form.costo_sin_iva}
                disabled={!form.impacta}
                onChange={(e) => setForm({ ...form, costo_sin_iva: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="g-label">IVA</span>
              <input
                className="g-input"
                inputMode="decimal"
                value={form.costo_iva}
                disabled={!form.impacta}
                onChange={(e) => setForm({ ...form, costo_iva: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="g-label">Costo total</span>
              <input className="g-input" readOnly value={textoMoneda(preview.total, form.moneda)} />
            </label>
            <label className="block">
              <span className="g-label">Monto abonado en $</span>
              <input className="g-input" readOnly value={textoEnPesos(preview.abonadoPesos, null, "ARS")} />
            </label>
            <label className="block">
              <span className="g-label">Monto pendiente en $</span>
              <input className="g-input" readOnly value={textoEnPesos(preview.pendiente, null, "ARS")} />
            </label>
            <div className="col-span-2 space-y-2 md:col-span-4">
              <span className="g-label">Formas de pago</span>
              {form.pagos.map((linea) => (
                <div key={linea.clave} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_11rem_1fr_auto]">
                  <select
                    className="g-input"
                    value={linea.id_forma_pago}
                    disabled={!form.impacta}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pagos: form.pagos.map((p) =>
                          p.clave === linea.clave ? { ...p, id_forma_pago: e.target.value } : p,
                        ),
                      })
                    }
                  >
                    <option value="">Elegí la forma</option>
                    {formas.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.forma_de_pago}
                      </option>
                    ))}
                    </select>
                  <select
                    className="g-input"
                    value={linea.moneda}
                    disabled={!form.impacta}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pagos: form.pagos.map((p) =>
                          p.clave === linea.clave
                            ? { ...p, moneda: e.target.value === "USD" ? "USD" : "ARS" }
                            : p,
                        ),
                      })
                    }
                  >
                    <option value="ARS">$ ARS</option>
                    <option value="USD">USD</option>
                  </select>
                  <input
                    className="g-input"
                    inputMode="decimal"
                    placeholder="Monto"
                    value={linea.monto}
                    disabled={!form.impacta}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pagos: form.pagos.map((p) =>
                          p.clave === linea.clave ? { ...p, monto: e.target.value } : p,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="g-btn g-btn-secondary"
                    onClick={() =>
                      setForm({
                        ...form,
                        pagos: form.pagos.filter((p) => p.clave !== linea.clave),
                      })
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="g-btn g-btn-secondary"
                onClick={() => setForm({ ...form, pagos: [...form.pagos, lineaVacia()] })}
              >
                <IconPlus className="h-4 w-4" />
                Agregar forma de pago
              </button>
            </div>
            <label className="block">
              <span className="g-label">Estado</span>
              <input className="g-input" readOnly value={etiquetaEstado(preview.estado)} />
            </label>
            <label className="col-span-2 flex items-end gap-2 pb-2 text-[13px]">
              <input
                type="checkbox"
                checked={form.cancelada}
                onChange={(e) => setForm({ ...form, cancelada: e.target.checked })}
              />
              Marcar factura como cancelada
            </label>
            <label className="col-span-2 block">
              <span className="g-label">Observaciones</span>
              <input
                className="g-input"
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              />
            </label>
            <label className="col-span-2 block">
              <span className="g-label">Comprobante de remito (PDF)</span>
              <input
                className="g-input"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) =>
                  setForm({ ...form, archivoRemito: e.target.files?.[0] ?? null, quitarRemito: false })
                }
              />
              {editando.ficha?.comprobante_remito ? (
                <span className="mt-1 flex items-center gap-2 text-[12px]">
                  <button
                    type="button"
                    className="g-btn g-btn-secondary g-btn-sm"
                    onClick={() => verArchivo(editando.ficha!.comprobante_remito)}
                  >
                    Ver remito
                  </button>
                  <span className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={form.quitarRemito}
                      onChange={(e) => setForm({ ...form, quitarRemito: e.target.checked })}
                    />
                    Quitar
                  </span>
                </span>
              ) : null}
            </label>
            <label className="col-span-2 block">
              <span className="g-label">Comprobante de factura (PDF o imagen)</span>
              <input
                className="g-input"
                type="file"
                accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  setForm({
                    ...form,
                    archivoFactura: e.target.files?.[0] ?? null,
                    quitarFactura: false,
                  })
                }
              />
              {editando.ficha?.comprobante_factura ? (
                <span className="mt-1 flex items-center gap-2 text-[12px]">
                  <button
                    type="button"
                    className="g-btn g-btn-secondary g-btn-sm"
                    onClick={() => verArchivo(editando.ficha!.comprobante_factura)}
                  >
                    Ver factura
                  </button>
                  <span className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={form.quitarFactura}
                      onChange={(e) => setForm({ ...form, quitarFactura: e.target.checked })}
                    />
                    Quitar
                  </span>
                </span>
              ) : null}
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="g-btn g-btn-secondary"
              onClick={() => {
                setForm(null);
                setEditClave(null);
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="g-btn g-btn-primary" disabled={pending || !!errorContable}>
              Guardar ficha
            </button>
          </div>
        </form>
      ) : null}

      <div className="relative">
        <div className="g-table-wrap">
          <div className="g-table-toolbar">
            <div className="g-filters">
              <label>
                <span className="g-label">Período</span>
                <select className="g-input" value={periodo} onChange={(e) => cambiarPeriodo(e.target.value)}>
                  <option value="este-mes">Este mes</option>
                  <option value="mes-anterior">Mes anterior</option>
                  <option value="este-anio">Este año</option>
                  <option value="todo">Todo</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </label>
              <label>
                <span className="g-label">Fecha desde</span>
                <input
                  type="date"
                  className="g-input"
                  value={desdeF}
                  onChange={(e) => {
                    setDesdeF(e.target.value);
                    setPeriodo("personalizado");
                  }}
                />
              </label>
              <label>
                <span className="g-label">Fecha hasta</span>
                <input
                  type="date"
                  className="g-input"
                  value={hastaF}
                  onChange={(e) => {
                    setHastaF(e.target.value);
                    setPeriodo("personalizado");
                  }}
                />
              </label>
              <label>
                <span className="g-label">Impacto</span>
                <select className="g-input" value={impactoF} onChange={(e) => setImpactoF(e.target.value)}>
                  <option value="impacta">Impacta</option>
                  <option value="no">No impacta</option>
                  <option value="todos">Todos</option>
                </select>
              </label>
              <label>
                <span className="g-label">Estado</span>
                <select className="g-input" value={estadoF} onChange={(e) => setEstadoF(e.target.value)}>
                  <option>Todos</option>
                  <option>Pendiente</option>
                  <option>Abonada</option>
                  <option>Cancelada</option>
                </select>
              </label>
              <label>
                <span className="g-label">Buscar</span>
                <div className="relative">
                  <IconSearch className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    className="g-input pl-7"
                    placeholder="Artículo, remito, factura…"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </label>
            </div>
            <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
          </div>
          <div className="g-table-scroll">
            <table className="g-table">
              <thead>
                <tr>
                  {visibles.map((c) => (
                    <th key={c.id}>{c.label}</th>
                  ))}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={visibles.length + 1} className="text-[var(--color-text-muted)]">
                      {filas.some((f) => f.kind === kind)
                        ? `No hay ingresos de ${MOVIMIENTOS[kind].titulo.toLowerCase()} con los filtros elegidos.`
                        : `No hay ingresos de ${MOVIMIENTOS[kind].titulo.toLowerCase()}.`}
                    </td>
                  </tr>
                ) : (
                  filtradas.map((fila) => (
                    <tr key={fila.clave} className={detalleClave === fila.clave ? "g-row-active" : ""}>
                      {visibles.map((c) => (
                        <td
                          key={c.id}
                          className={
                            c.id === "articulo"
                              ? "font-medium"
                              : DINERO.has(c.id)
                                ? "tabular-nums"
                                : undefined
                          }
                        >
                          {c.id === "impacto" ? (
                            puedeEditar ? (
                              <select
                                className="g-input"
                                value={fila.impacta ? "impacta" : "no"}
                                disabled={pending}
                                onChange={(e) => onImpacto(fila, e.target.value === "impacta")}
                              >
                                <option value="impacta">Impacta</option>
                                <option value="no">No impacta</option>
                              </select>
                            ) : (
                              <span>{fila.impacta ? "Impacta" : "No impacta"}</span>
                            )
                          ) : c.id === "estado" ? (
                            <span className={claseEstado(fila.estado)}>{etiquetaEstado(fila.estado)}</span>
                          ) : (
                            <span className="g-truncate block max-w-[220px]" title={textoCol(c.id, fila)}>
                              {textoCol(c.id, fila)}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <RowDetailButton onClick={() => setDetalleClave(fila.clave)} />
                          {puedeEditar ? (
                            <>
                              <RowEditButton onClick={() => abrirEditar(fila)} />
                              <RowDeleteButton
                                disabled={pending || !fila.ficha}
                                onClick={() => onEliminar(fila)}
                              />
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {detalle ? (
          <RecordDetailDrawer
            heading="Detalle del ingreso"
            title={detalle.movimiento.nombre || detalle.movimiento.codigo || "Ingreso"}
            badge={<span className={claseEstado(detalle.estado)}>{etiquetaEstado(detalle.estado)}</span>}
            onClose={() => setDetalleClave(null)}
          >
            <DetalleFilas
              filas={[
                { label: "Tipo de artículo", valor: detalle.tipoArticulo },
                { label: "Id movimiento", valor: String(detalle.movimiento.id) },
                { label: "Fecha", valor: fechaVisible(aFecha(detalle.movimiento.fecha_registro)) },
                { label: "Artículo", valor: detalle.movimiento.nombre || "—" },
                { label: "Código", valor: detalle.movimiento.codigo || "—" },
                { label: "Lote", valor: detalle.movimiento.lote || "—" },
                {
                  label: MOVIMIENTOS[detalle.kind].etiquetaCantidad,
                  valor: `${nroVisible(detalle.movimiento.cantidad, 3)} ${detalle.movimiento.unidad}`,
                },
                {
                  label: "Vencimiento del artículo",
                  valor: fechaVisible(aFecha(detalle.movimiento.fecha_vencimiento)),
                },
                { label: "Remito", valor: detalle.movimiento.remito || "—" },
                { label: "Proveedor", valor: detalle.movimiento.proveedor || "—" },
                { label: "Categoría", valor: detalle.movimiento.categoria || "—" },
                { label: "Gestión", valor: detalle.movimiento.gestion || "—" },
                { label: "Observaciones del movimiento", valor: detalle.movimiento.observaciones || "—" },
                { label: "Nº de factura", valor: detalle.ficha?.numero_factura || "—" },
                {
                  label: "Vencimiento de facturación",
                  valor: fechaVisible(aFecha(detalle.ficha?.vencimiento_facturacion)),
                },
                { label: "Impacto", valor: detalle.impacta ? "Impacta" : "No impacta" },
                { label: "Moneda del costo", valor: detalle.monedaCosto === "USD" ? "USD" : "Peso argentino" },
                {
                  label: "Costo sin IVA",
                  valor: textoMoneda(detalle.ficha?.costo_sin_iva ?? null, detalle.monedaCosto),
                },
                { label: "IVA", valor: textoMoneda(detalle.ficha?.costo_iva ?? null, detalle.monedaCosto) },
                {
                  label: "Costo total en $",
                  valor: textoEnPesos(detalle.costoTotalPesos, detalle.costoTotal, detalle.monedaCosto),
                },
                { label: "Monto abonado en $", valor: textoEnPesos(detalle.montoAbonadoPesos, null, "ARS") },
                { label: "Monto pendiente en $", valor: textoEnPesos(detalle.montoPendientePesos, null, "ARS") },
                ...(detalle.pagos.length
                  ? detalle.pagos.map((p, i) => ({
                      label: `Pago ${i + 1}`,
                      valor: `${p.forma || "Sin forma"} · ${textoMoneda(p.monto, p.moneda)}`,
                    }))
                  : [{ label: "Formas de pago", valor: "—" }]),
                { label: "Estado", valor: etiquetaEstado(detalle.estado) },
                { label: "Observaciones contables", valor: detalle.ficha?.observaciones || "—" },
                { label: "Usuario que registró", valor: detalle.ficha ? detalle.usuarioRegistro : "—" },
                {
                  label: "Fecha de la ficha",
                  valor: fechaHoraVisible(detalle.ficha?.fecha_hora_registro || ""),
                },
                { label: "Última actualización", valor: textoCol("actualizacion", detalle) },
              ]}
            />
            {detalle.ficha?.comprobante_remito || detalle.ficha?.comprobante_factura ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {detalle.ficha.comprobante_remito ? (
                  <button
                    type="button"
                    className="g-btn g-btn-secondary g-btn-sm"
                    onClick={() => verArchivo(detalle.ficha!.comprobante_remito)}
                  >
                    Ver remito
                  </button>
                ) : null}
                {detalle.ficha.comprobante_factura ? (
                  <button
                    type="button"
                    className="g-btn g-btn-secondary g-btn-sm"
                    onClick={() => verArchivo(detalle.ficha!.comprobante_factura)}
                  >
                    Ver factura
                  </button>
                ) : null}
              </div>
            ) : null}
          </RecordDetailDrawer>
        ) : null}
      </div>
    </div>
  );
}
