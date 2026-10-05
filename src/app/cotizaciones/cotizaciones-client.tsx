"use client";

import { useState } from "react";
import { SolapaFazon } from "@/app/cotizaciones/solapa-fazon";
import { SolapaIngredientes } from "@/app/cotizaciones/solapa-ingredientes";
import { SolapaProductos } from "@/app/cotizaciones/solapa-productos";
import type {
  CotizProductoGuardada,
  FilaProductoCotiz,
  ListaFazon,
  ListaMp,
  ParFazon,
  ProductoCotiz,
  SolapaCotiz,
} from "@/lib/cotizaciones/logic";
import type { OpcionIngrediente, VersionVista } from "@/lib/recetas/logic";

const TABS: { id: SolapaCotiz; label: string }[] = [
  { id: "ingredientes", label: "Ingredientes" },
  { id: "fazon", label: "Fazón" },
  { id: "productos", label: "Productos" },
];

export function CotizacionesClient({
  ingredientes,
  productos,
  paresFazon,
  versiones,
  listasMp,
  listasFazon,
  filasProducto,
  cotizacionesProducto,
  errorCarga,
  puedeEditar,
}: {
  ingredientes: OpcionIngrediente[];
  productos: ProductoCotiz[];
  paresFazon: ParFazon[];
  versiones: VersionVista[];
  listasMp: ListaMp[];
  listasFazon: ListaFazon[];
  filasProducto: FilaProductoCotiz[];
  cotizacionesProducto: CotizProductoGuardada[];
  errorCarga: string | null;
  puedeEditar: boolean;
}) {
  const [tab, setTab] = useState<SolapaCotiz>("ingredientes");

  return (
    <div className="g-stack">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="g-page-title">Cotizaciones</h1>
          <p className="g-page-subtitle">
            Listas de costo interno por tonelada (ingredientes, fazón y productos). No es la cotización
            del dólar.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? "g-btn g-btn-primary" : "g-btn g-btn-secondary"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ingredientes" ? (
        <SolapaIngredientes
          ingredientes={ingredientes}
          listas={listasMp}
          errorCarga={errorCarga}
          puedeEditar={puedeEditar}
        />
      ) : null}
      {tab === "fazon" ? (
        <SolapaFazon
          pares={paresFazon}
          listas={listasFazon}
          errorCarga={errorCarga}
          puedeEditar={puedeEditar}
        />
      ) : null}
      {tab === "productos" ? (
        <SolapaProductos
          productos={productos}
          pares={paresFazon}
          versiones={versiones}
          listasMp={listasMp}
          listasFazon={listasFazon}
          filas={filasProducto}
          guardadas={cotizacionesProducto}
          errorCarga={errorCarga}
          puedeEditar={puedeEditar}
        />
      ) : null}
    </div>
  );
}
