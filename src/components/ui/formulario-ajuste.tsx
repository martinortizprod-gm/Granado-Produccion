"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { IconClose } from "@/components/ui/icons";
import { guardarMovimiento } from "@/app/movimientos/actions";
import {
  ArticuloOpcion,
  cantidadesPallets,
  DatosMovimientoForm,
  KindMovimiento,
  MOVIMIENTOS,
  hoyIso,
  validarMovimiento,
} from "@/lib/movimientos/logic";
import { aFecha, clave, numero, texto } from "@/lib/solicitudes/logic";

export type LoteAjuste = {
  lote: string;
  stock: number;
  vencimiento?: string;
  unPorPall?: number;
  pesoUn?: number;
  stkUn?: number;
  stkKg?: number;
};

export type ArticuloAjuste = {
  id: number;
  codigo: string;
  nombre: string;
  categoria?: string;
  gestion?: string;
  medida?: string;
  stock: number;
  stkUn?: number;
  stkKg?: number;
  lotes: LoteAjuste[];
};

function nro(valor: number) {
  const n = Number(valor) || 0;
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n).toLocaleString("es-AR");
  return n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function esEgreso(tipo: string) {
  return clave(tipo).startsWith("egre") || clave(tipo) === "salida";
}

function lotesVisibles(tipo: string, lotes: LoteAjuste[]) {
  if (esEgreso(tipo)) return lotes.filter((l) => l.stock > 0.0005);
  return lotes;
}

function elegirLote(tipo: string, lotes: LoteAjuste[], preferido: string) {
  const visibles = lotesVisibles(tipo, lotes);
  const pref = texto(preferido);
  if (
    pref &&
    (visibles.some((l) => clave(l.lote) === clave(pref)) || !esEgreso(tipo))
  ) {
    return pref;
  }
  if (visibles.length === 1) return visibles[0].lote;
  return visibles[0]?.lote ?? "";
}

function factores(lote: LoteAjuste | undefined) {
  if (!lote) return { unPorPall: 0, pesoUn: 0 };
  if ((lote.unPorPall ?? 0) > 0) {
    return { unPorPall: lote.unPorPall ?? 0, pesoUn: lote.pesoUn ?? 0 };
  }
  if (lote.stock > 0.0005 && (lote.stkUn ?? 0) > 0) {
    return {
      unPorPall: lote.stkUn! / lote.stock,
      pesoUn: lote.stkUn! > 0.0005 ? (lote.stkKg ?? 0) / lote.stkUn! : 0,
    };
  }
  return { unPorPall: 0, pesoUn: 0 };
}

export function FormularioAjuste({
  kind,
  articulo,
  loteInicial = "",
  onCerrar,
  onGuardado,
}: {
  kind: KindMovimiento;
  articulo: ArticuloAjuste;
  loteInicial?: string;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const cfg = MOVIMIENTOS[kind];
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState(() =>
    articulo.lotes.some((l) => l.stock > 0.0005) ? "Egreso" : "Ingreso",
  );
  const [lote, setLote] = useState(() =>
    elegirLote(
      articulo.lotes.some((l) => l.stock > 0.0005) ? "Egreso" : "Ingreso",
      articulo.lotes,
      loteInicial,
    ),
  );
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState<string | null>(null);
  const totalRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => totalRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    function onTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", onTecla);
    return () => window.removeEventListener("keydown", onTecla);
  }, [onCerrar]);

  const visibles = useMemo(() => lotesVisibles(tipo, articulo.lotes), [tipo, articulo.lotes]);
  const loteSel = articulo.lotes.find((l) => clave(l.lote) === clave(lote));
  const unidad = cfg.esProducto ? cfg.unidad : articulo.medida || cfg.unidad;
  const qty = numero(cantidad);
  const stockActual = loteSel
    ? Math.max(0, loteSel.stock)
    : texto(lote) === ""
      ? Math.max(0, articulo.stock)
      : 0;
  const stockNuevo = esEgreso(tipo) ? stockActual - qty : stockActual + qty;
  const fact = factores(loteSel);
  const unKgActual = cfg.esProducto
    ? loteSel && (loteSel.stkUn || loteSel.stkKg)
      ? { un: loteSel.stkUn ?? 0, kg: loteSel.stkKg ?? 0 }
      : fact.unPorPall > 0
        ? { un: cantidadesPallets(stockActual, fact.unPorPall, fact.pesoUn).unidades, kg: cantidadesPallets(stockActual, fact.unPorPall, fact.pesoUn).kg }
        : { un: articulo.stkUn ?? 0, kg: articulo.stkKg ?? 0 }
    : null;
  const unKgMov =
    cfg.esProducto && fact.unPorPall > 0 && qty > 0
      ? cantidadesPallets(qty, fact.unPorPall, fact.pesoUn)
      : null;
  const unKgNuevo =
    cfg.esProducto && unKgActual
      ? {
          un: esEgreso(tipo)
            ? unKgActual.un - (unKgMov?.unidades ?? 0)
            : unKgActual.un + (unKgMov?.unidades ?? 0),
          kg: esEgreso(tipo)
            ? unKgActual.kg - (unKgMov?.kg ?? 0)
            : unKgActual.kg + (unKgMov?.kg ?? 0),
        }
      : null;

  const colorNuevo =
    stockNuevo < -0.0005
      ? "var(--color-danger)"
      : qty > 0 && esEgreso(tipo)
        ? "var(--color-info)"
        : "var(--color-primary)";

  const artOpcion: ArticuloOpcion = {
    id: articulo.id,
    codigo: articulo.codigo,
    nombre: articulo.nombre,
    categoria: articulo.categoria ?? "",
    gestion: articulo.gestion ?? "",
    medida: articulo.medida || cfg.unidad,
    estado: "Activo",
    activo: true,
    lotes: articulo.lotes.map((l) => {
      const f = factores(l);
      return {
        lote: l.lote,
        stock: l.stock,
        vencimiento: l.vencimiento ?? "",
        unPorPall: f.unPorPall,
        pesoUn: f.pesoUn,
      };
    }),
  };

  function cambiarTipo(siguiente: string) {
    setTipo(siguiente);
    setLote((actual) => elegirLote(siguiente, articulo.lotes, actual));
  }

  function onGuardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const datos: DatosMovimientoForm = {
      tipo,
      id_catalogo: String(articulo.id),
      fecha_registro: hoyIso(),
      fecha_vencimiento: aFecha(loteSel?.vencimiento) ?? "",
      lote,
      cantidad,
      remito: "",
      proveedor: "",
      observaciones: "Ajuste",
    };
    const errores = [...validarMovimiento(cfg, datos, [artOpcion])];
    if (!texto(lote)) errores.unshift("Ingresá o seleccioná un lote.");
    if (errores.length) {
      setError([...new Set(errores)].join(" "));
      return;
    }
    startTransition(async () => {
      try {
        await guardarMovimiento(kind, datos);
        onGuardado();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo registrar el ajuste");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4"
      onClick={onCerrar}
    >
      <form
        className="g-card my-8 w-full max-w-[28rem] space-y-3 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-ajuste"
        onClick={(evento) => evento.stopPropagation()}
        onSubmit={onGuardar}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p id="titulo-ajuste" className="g-section-title">
              Ajuste de stock — {cfg.etiquetaItem}
            </p>
            <p className="mt-1 text-[13px] font-medium">
              {articulo.nombre || articulo.codigo || cfg.etiquetaItem}
            </p>
          </div>
          <button
            type="button"
            className="g-btn g-btn-icon h-7 w-7"
            aria-label="Cerrar"
            onClick={onCerrar}
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <label className="block">
          <span className="g-label">Lote</span>
          <input
            className="g-input"
            list={`ajuste-lotes-${kind}-${articulo.id}`}
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            autoComplete="off"
          />
          <datalist id={`ajuste-lotes-${kind}-${articulo.id}`}>
            {visibles.map((l) => (
              <option key={l.lote} value={l.lote}>
                {`${nro(l.stock)} ${unidad}`}
              </option>
            ))}
          </datalist>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <p className="col-span-2 text-[13px]">
            <span className="text-[var(--color-text-muted)]">Stock del artículo: </span>
            <span className="font-medium tabular-nums">
              {cfg.esProducto
                ? `${nro(articulo.stock)} Pall.  ·  ${nro(articulo.stkUn ?? 0)} Un.  ·  ${nro(articulo.stkKg ?? 0)} kg`
                : `${nro(articulo.stock)} ${unidad}`}
            </span>
          </p>
          <p className="col-span-2 text-[13px]">
            <span className="text-[var(--color-text-muted)]">
              {loteSel ? `Stock del lote ${loteSel.lote}: ` : "Stock del lote: "}
            </span>
            <span className="font-medium tabular-nums">
              {loteSel
                ? cfg.esProducto && unKgActual
                  ? `${nro(stockActual)} Pall.  ·  ${nro(unKgActual.un)} Un.  ·  ${nro(unKgActual.kg)} kg`
                  : `${nro(stockActual)} ${unidad}`
                : texto(lote)
                  ? `0 ${unidad}`
                  : "—"}
            </span>
          </p>
          <label className="block">
            <span className="g-label">Ajuste</span>
            <select className="g-input" value={tipo} onChange={(e) => cambiarTipo(e.target.value)}>
              <option>Ingreso</option>
              <option>Egreso</option>
            </select>
          </label>
          <label className="block">
            <span className="g-label">{cfg.esProducto ? "Pallets" : "Total"}</span>
            <input
              ref={totalRef}
              className="g-input"
              inputMode="decimal"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
          </label>
          {cfg.esProducto ? (
            <p className="col-span-2 text-[13px]">
              <span className="text-[var(--color-text-muted)]">Unidades / kg: </span>
              <span className="tabular-nums">
                {unKgMov ? `${nro(unKgMov.unidades)} Un.  ·  ${nro(unKgMov.kg)} kg` : "—"}
              </span>
            </p>
          ) : null}
          <p className="col-span-2 text-[13px]">
            <span className="text-[var(--color-text-muted)]">
              {loteSel ? "Stock nuevo del lote: " : "Stock nuevo: "}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: colorNuevo }}>
              {cfg.esProducto && unKgNuevo
                ? `${nro(stockNuevo)} Pall.  ·  ${nro(unKgNuevo.un)} Un.  ·  ${nro(unKgNuevo.kg)} kg`
                : `${nro(stockNuevo)} ${unidad}`}
            </span>
          </p>
        </div>

        {error ? <p className="g-alert g-alert-danger">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button type="button" className="g-btn g-btn-secondary" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="g-btn g-btn-primary" disabled={pending}>
            Agregar
          </button>
        </div>
      </form>
    </div>
  );
}
