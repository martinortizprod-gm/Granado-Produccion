"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconSearch } from "@/components/ui/icons";
import { ColumnPicker } from "@/components/ui/column-picker";
import {
  RecordDetailDrawer,
  RowDeleteButton,
  RowDetailButton,
  RowEditButton,
} from "@/components/ui/record-detail";
import { useColumnVisibility } from "@/components/ui/use-column-visibility";
import { eliminarParte, guardarParte } from "@/app/terceros/actions";
import {
  DatosParteForm,
  KindParte,
  PARTES,
  ParteVista,
  desdeParte,
  filtrarPartes,
  vacioParte,
} from "@/lib/terceros/logic";

const COLS = [
  { id: "nombre", label: "Nombre" },
  { id: "razon", label: "Razón social" },
  { id: "cuit", label: "CUIT" },
  { id: "celular", label: "Celular" },
  { id: "mail", label: "Mail" },
  { id: "ubicacion", label: "Ubicación" },
  { id: "observaciones", label: "Observaciones" },
  { id: "acciones", label: "Acciones", locked: true },
];

export function TercerosClient({
  kind,
  items,
  errorCarga,
  puedeEditar,
}: {
  kind: KindParte;
  items: ParteVista[];
  errorCarga: string | null;
  puedeEditar: boolean;
}) {
  const cfg = PARTES[kind];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [form, setForm] = useState<DatosParteForm | null>(null);
  const [idEdicion, setIdEdicion] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const cols = useColumnVisibility(kind, COLS);
  const show = cols.isVisible;

  const filtrados = useMemo(() => filtrarPartes(items, busqueda), [items, busqueda]);
  const detalle = filtrados.find((item) => item.id === detalleId) ?? null;

  function abrirNuevo() {
    setIdEdicion(undefined);
    setForm(vacioParte());
    setError(null);
  }

  function abrirEditar(item: ParteVista) {
    setIdEdicion(item.id);
    setForm(desdeParte(item));
    setError(null);
  }

  function onGuardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await guardarParte(kind, form, idEdicion);
        setAviso(idEdicion ? "Cambios guardados." : "Registro creado.");
        setForm(null);
        setIdEdicion(undefined);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function onEliminar(item: ParteVista) {
    if (!confirm(`¿Eliminar ${cfg.etiqueta.toLowerCase()} ${item.nombre}?`)) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await eliminarParte(kind, item.id);
        if (detalleId === item.id) setDetalleId(null);
        setAviso("Registro eliminado.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar");
      }
    });
  }

  return (
    <div className="g-stack">
      {errorCarga ? <p className="g-alert g-alert-danger">{errorCarga}</p> : null}
      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {aviso ? <p className="g-alert g-alert-success">{aviso}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="g-page-title">{cfg.titulo}</h1>
          <p className="g-page-subtitle">{cfg.subtitulo}</p>
        </div>
        {puedeEditar ? (
          <button type="button" className="g-btn g-btn-primary" onClick={abrirNuevo}>
            <IconPlus className="h-4 w-4" />
            {cfg.nuevo}
          </button>
        ) : null}
      </div>

      {form ? (
        <form className="g-card space-y-3 p-3" onSubmit={onGuardar}>
          <p className="g-section-title">
            {idEdicion ? `Editar ${cfg.etiqueta.toLowerCase()}` : cfg.nuevo}
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <label className="block">
              <span className="g-label">Nombre</span>
              <input
                className="g-input"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="g-label">Razón social</span>
              <input
                className="g-input"
                value={form.razon_social}
                onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="g-label">CUIT</span>
              <input
                className="g-input"
                value={form.cuit}
                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="g-label">Celular</span>
              <input
                className="g-input"
                value={form.celular}
                onChange={(e) => setForm({ ...form, celular: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="g-label">Mail</span>
              <input
                className="g-input"
                type="email"
                value={form.mail}
                onChange={(e) => setForm({ ...form, mail: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="g-label">Ubicación</span>
              <input
                className="g-input"
                value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
              />
            </label>
            <label className="col-span-2 block">
              <span className="g-label">Observaciones</span>
              <input
                className="g-input"
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setForm(null)}>
              Cancelar
            </button>
            <button type="submit" className="g-btn g-btn-primary" disabled={pending}>
              Guardar
            </button>
          </div>
        </form>
      ) : null}

      <div className="relative">
        <div className="g-table-wrap">
          <div className="g-table-toolbar">
            <div className="g-filters">
              <label>
                <span className="g-label">Buscar</span>
                <div className="relative">
                  <IconSearch className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    className="g-input pl-7"
                    placeholder="Nombre, CUIT, mail…"
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
                  {show("nombre") ? <th>Nombre</th> : null}
                  {show("razon") ? <th>Razón social</th> : null}
                  {show("cuit") ? <th>CUIT</th> : null}
                  {show("celular") ? <th>Celular</th> : null}
                  {show("mail") ? <th>Mail</th> : null}
                  {show("ubicacion") ? <th>Ubicación</th> : null}
                  {show("observaciones") ? <th>Observaciones</th> : null}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={cols.visibleCount}
                      className="px-4 py-8 text-center text-[var(--color-text-muted)]"
                    >
                      No hay registros con estos filtros.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((item) => (
                    <tr key={item.id} className={detalleId === item.id ? "g-row-active" : ""}>
                      {show("nombre") ? (
                        <td className="max-w-[180px] font-medium">
                          <span className="g-truncate block" title={item.nombre}>
                            {item.nombre}
                          </span>
                        </td>
                      ) : null}
                      {show("razon") ? (
                        <td className="max-w-[180px]">
                          <span className="g-truncate block" title={item.razon_social}>
                            {item.razon_social || "—"}
                          </span>
                        </td>
                      ) : null}
                      {show("cuit") ? <td className="whitespace-nowrap">{item.cuit || "—"}</td> : null}
                      {show("celular") ? <td className="whitespace-nowrap">{item.celular || "—"}</td> : null}
                      {show("mail") ? (
                        <td className="max-w-[160px]">
                          <span className="g-truncate block" title={item.mail}>
                            {item.mail || "—"}
                          </span>
                        </td>
                      ) : null}
                      {show("ubicacion") ? (
                        <td className="max-w-[160px]">
                          <span className="g-truncate block" title={item.ubicacion}>
                            {item.ubicacion || "—"}
                          </span>
                        </td>
                      ) : null}
                      {show("observaciones") ? (
                        <td className="max-w-[180px]">
                          <span className="g-truncate block" title={item.observaciones}>
                            {item.observaciones || "—"}
                          </span>
                        </td>
                      ) : null}
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <RowDetailButton onClick={() => setDetalleId(item.id)} />
                          {puedeEditar ? (
                            <>
                              <RowEditButton onClick={() => abrirEditar(item)} />
                              <RowDeleteButton disabled={pending} onClick={() => onEliminar(item)} />
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
            heading={`Detalle de ${cfg.etiqueta.toLowerCase()}`}
            title={detalle.nombre}
            onClose={() => setDetalleId(null)}
          >
            <dl className="space-y-1 text-[13px]">
              <Fila label="Nombre" valor={detalle.nombre || "—"} />
              <Fila label="Razón social" valor={detalle.razon_social || "—"} />
              <Fila label="CUIT" valor={detalle.cuit || "—"} />
              <Fila label="Celular" valor={detalle.celular || "—"} />
              <Fila label="Mail" valor={detalle.mail || "—"} />
              <Fila label="Ubicación" valor={detalle.ubicacion || "—"} />
              <Fila label="Observaciones" valor={detalle.observaciones || "—"} />
              <Fila label="Id" valor={String(detalle.id)} />
            </dl>
          </RecordDetailDrawer>
        ) : null}
      </div>

      <p className="text-[11px] text-[var(--color-text-muted)]">
        {items.length} registrados.
        {puedeEditar ? "" : " Tenés acceso de solo lectura en este módulo."}
      </p>
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <dt className="shrink-0 text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-right font-medium">{valor}</dd>
    </div>
  );
}
