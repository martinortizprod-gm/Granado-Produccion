"use client";

import { useState } from "react";
import { ColumnPicker } from "@/components/ui/column-picker";
import {
  DetalleFilas,
  RecordDetailDrawer,
  RowDetailButton,
} from "@/components/ui/record-detail";
import { useColumnVisibility } from "@/components/ui/use-column-visibility";

type Producto = {
  id: number;
  codigo: string | null;
  producto: string | null;
  categoria: string | null;
  medida: string | null;
};

const COLS = [
  { id: "id", label: "ID" },
  { id: "codigo", label: "Código" },
  { id: "producto", label: "Producto" },
  { id: "categoria", label: "Categoría" },
  { id: "medida", label: "Medida" },
  { id: "acciones", label: "Acciones", locked: true },
];

export function ProductosTabla({ productos }: { productos: Producto[] }) {
  const cols = useColumnVisibility("productos", COLS);
  const show = cols.isVisible;
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const detalle = productos.find((p) => p.id === detalleId) ?? null;

  return (
    <div className="relative">
      <div className="g-table-wrap">
        <div className="g-table-toolbar">
          <div>
            <p className="g-section-title">Catálogo</p>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              {productos.length} registro(s)
            </p>
          </div>
          <ColumnPicker
            cols={cols.cols}
            isVisible={cols.isVisible}
            onToggle={cols.toggle}
          />
        </div>
        <div className="g-table-scroll">
          <table className="g-table">
            <thead>
              <tr>
                {show("id") ? <th>ID</th> : null}
                {show("codigo") ? <th>Código</th> : null}
                {show("producto") ? <th>Producto</th> : null}
                {show("categoria") ? <th>Categoría</th> : null}
                {show("medida") ? <th>Medida</th> : null}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr
                  key={p.id}
                  className={detalleId === p.id ? "g-row-active" : ""}
                >
                  {show("id") ? (
                    <td className="tabular-nums">{p.id}</td>
                  ) : null}
                  {show("codigo") ? <td>{p.codigo ?? "—"}</td> : null}
                  {show("producto") ? (
                    <td className="font-medium">{p.producto ?? "—"}</td>
                  ) : null}
                  {show("categoria") ? <td>{p.categoria ?? "—"}</td> : null}
                  {show("medida") ? <td>{p.medida ?? "—"}</td> : null}
                  <td>
                    <RowDetailButton onClick={() => setDetalleId(p.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {detalle ? (
        <RecordDetailDrawer
          heading="Detalle de producto"
          title={detalle.producto || "Producto"}
          onClose={() => setDetalleId(null)}
        >
          <DetalleFilas
            filas={[
              { label: "ID", valor: String(detalle.id) },
              { label: "Código", valor: detalle.codigo ?? "—" },
              { label: "Producto", valor: detalle.producto ?? "—" },
              { label: "Categoría", valor: detalle.categoria ?? "—" },
              { label: "Medida", valor: detalle.medida ?? "—" },
            ]}
          />
        </RecordDetailDrawer>
      ) : null}
    </div>
  );
}
