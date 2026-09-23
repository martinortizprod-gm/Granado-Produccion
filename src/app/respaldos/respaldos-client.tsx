"use client";

import { IconChevron } from "@/components/ui/icons";
import type { FormatoRespaldo, TablaRespaldo } from "@/lib/respaldos/tipos";
import { useMemo, useState } from "react";

const FORMATOS: {
  id: FormatoRespaldo;
  ext: string;
  titulo: string;
  recomendado?: boolean;
}[] = [
  {
    id: "json",
    ext: ".json",
    titulo: "Respaldo recomendado. Conserva todos los valores y sirve para guardar la copia.",
    recomendado: true,
  },
  {
    id: "sql",
    ext: ".sql",
    titulo: "Script con INSERT de los datos elegidos. No borra lo que ya está cargado.",
  },
  {
    id: "xlsx",
    ext: ".xlsx",
    titulo: "Excel, una hoja por tabla.",
  },
  {
    id: "pdf",
    ext: ".pdf",
    titulo: "Para leer. Recorta textos largos y, si la tabla es muy grande, lista las primeras filas.",
  },
];

function nro(valor: number) {
  return new Intl.NumberFormat("es-AR").format(valor);
}

function Casilla({
  checked,
  indeterminado,
  onChange,
  etiqueta,
}: {
  checked: boolean;
  indeterminado?: boolean;
  onChange: () => void;
  etiqueta: string;
}) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 shrink-0"
      style={{ accentColor: "var(--color-primary)" }}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = Boolean(indeterminado);
      }}
      onChange={onChange}
      aria-label={etiqueta}
    />
  );
}

function IconoFormato({ id }: { id: FormatoRespaldo }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-6 w-6",
    "aria-hidden": true,
  };
  if (id === "xlsx") {
    return (
      <svg {...common}>
        <rect x="4" y="3.5" width="16" height="17" rx="2" />
        <path d="M4 9h16M4 14h16M10 9v11.5M15 9v11.5" />
      </svg>
    );
  }
  if (id === "pdf") {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" />
        <path d="M14 3.5V9h5" />
        <path d="M8.5 16.5h7M8.5 13h7" />
      </svg>
    );
  }
  if (id === "sql") {
    return (
      <svg {...common}>
        <ellipse cx="12" cy="7" rx="7" ry="3" />
        <path d="M5 7v10c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
        <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 6 3.5 12 8 18" />
      <path d="M16 6 20.5 12 16 18" />
      <path d="M13 5 11 19" />
    </svg>
  );
}

export function RespaldosClient({ tablas }: { tablas: TablaRespaldo[] }) {
  const [columnasOn, setColumnasOn] = useState<Record<string, Record<string, boolean>>>(() => {
    const ini: Record<string, Record<string, boolean>> = {};
    for (const tabla of tablas) {
      ini[tabla.nombre] = Object.fromEntries(tabla.columnas.map((col) => [col, true]));
    }
    return ini;
  });
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [formato, setFormato] = useState<FormatoRespaldo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resumen = useMemo(() => {
    let tablasMarcadas = 0;
    let columnasMarcadas = 0;
    let columnasTotal = 0;
    for (const tabla of tablas) {
      const map = columnasOn[tabla.nombre] ?? {};
      const n = tabla.columnas.filter((col) => map[col]).length;
      columnasTotal += tabla.columnas.length;
      columnasMarcadas += n;
      if (n > 0) tablasMarcadas += 1;
    }
    return { tablasMarcadas, columnasMarcadas, columnasTotal };
  }, [tablas, columnasOn]);

  function estado(tabla: TablaRespaldo) {
    const map = columnasOn[tabla.nombre] ?? {};
    const n = tabla.columnas.filter((col) => map[col]).length;
    return {
      n,
      todas: tabla.columnas.length > 0 && n === tabla.columnas.length,
      alguna: n > 0 && n < tabla.columnas.length,
    };
  }

  function marcarTabla(nombre: string, activo: boolean) {
    const tabla = tablas.find((t) => t.nombre === nombre);
    if (!tabla) return;
    setColumnasOn((prev) => ({
      ...prev,
      [nombre]: Object.fromEntries(tabla.columnas.map((col) => [col, activo])),
    }));
  }

  function marcarTodas(activo: boolean) {
    setColumnasOn(() => {
      const ini: Record<string, Record<string, boolean>> = {};
      for (const tabla of tablas) {
        ini[tabla.nombre] = Object.fromEntries(tabla.columnas.map((col) => [col, activo]));
      }
      return ini;
    });
  }

  function marcarColumna(tabla: string, col: string, activo: boolean) {
    setColumnasOn((prev) => ({
      ...prev,
      [tabla]: { ...(prev[tabla] ?? {}), [col]: activo },
    }));
  }

  async function exportar(id: FormatoRespaldo) {
    const seleccion = tablas
      .map((tabla) => ({
        nombre: tabla.nombre,
        columnas: tabla.columnas.filter((col) => columnasOn[tabla.nombre]?.[col]),
      }))
      .filter((tabla) => tabla.columnas.length > 0);
    if (!seleccion.length) {
      setError("Marcá al menos una tabla y una columna.");
      return;
    }
    setError(null);
    setFormato(id);
    try {
      const res = await fetch("/api/respaldos", {
        method: "POST",
        redirect: "manual",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formato: id, tablas: seleccion }),
      });
      if (res.status === 0 || res.status === 302 || res.status === 307) {
        throw new Error("La sesión venció. Volvé a entrar.");
      }
      const tipo = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        const data = tipo.includes("json") ? await res.json() : null;
        throw new Error(data?.error || "No se pudo exportar el respaldo.");
      }
      const blob = await res.blob();
      const disp = res.headers.get("content-disposition") ?? "";
      const nombre = /filename="([^"]+)"/.exec(disp)?.[1] || `respaldo${FORMATOS.find((f) => f.id === id)?.ext ?? ""}`;
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo exportar el respaldo.");
    } finally {
      setFormato(null);
    }
  }

  const todas =
    tablas.length > 0 && resumen.columnasMarcadas === resumen.columnasTotal;
  const alguna = resumen.columnasMarcadas > 0 && !todas;
  const ocupado = formato != null;

  if (!tablas.length) {
    return <p className="g-alert g-alert-warning">No hay tablas para exportar.</p>;
  }

  return (
    <>
      <section className="g-card sticky top-0 z-10 p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="g-section-title">Exportar selección</p>
            <p className="mt-0.5 text-[12.5px] text-[var(--color-text-muted)]">
              {nro(resumen.tablasMarcadas)} de {nro(tablas.length)} tablas · {nro(resumen.columnasMarcadas)} columnas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FORMATOS.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.titulo}
                disabled={ocupado || resumen.tablasMarcadas === 0}
                onClick={() => void exportar(item.id)}
                className="flex w-[76px] flex-col items-center gap-1 rounded-[var(--radius-md)] border px-1 py-2 text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-55"
                style={{
                  background: item.recomendado ? "var(--color-primary-light)" : "var(--color-surface)",
                  borderColor: item.recomendado ? "var(--color-primary-muted)" : "var(--color-border)",
                }}
              >
                <IconoFormato id={item.id} />
                <span className="text-[11px] font-semibold">{item.ext}</span>
                {item.recomendado ? (
                  <span className="g-badge g-badge-success px-1.5 py-0 text-[10px]">Respaldo</span>
                ) : (
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {item.id === "pdf" ? "Lectura" : "Datos"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-snug text-[var(--color-text-muted)]">
          JSON es el formato más fiel para guardar la copia. SQL y Excel llevan los mismos datos.
          El PDF es para lectura y puede recortar celdas largas.
        </p>
        {error ? <p className="g-alert g-alert-danger mt-2">{error}</p> : null}
        {ocupado ? (
          <p className="mt-2 text-[12.5px] text-[var(--color-text-secondary)]">
            Generando {formato}…
          </p>
        ) : null}
      </section>

      <section className="g-card overflow-hidden">
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <label className="inline-flex items-center gap-2 text-[13px] font-medium">
            <Casilla
              checked={todas}
              indeterminado={alguna}
              onChange={() => marcarTodas(!todas)}
              etiqueta="Marcar todas las tablas"
            />
            Todas las tablas
          </label>
          <div className="flex gap-2">
            <button type="button" className="g-btn g-btn-ghost g-btn-sm" onClick={() => marcarTodas(true)}>
              Marcar todas
            </button>
            <button type="button" className="g-btn g-btn-ghost g-btn-sm" onClick={() => marcarTodas(false)}>
              Desmarcar todas
            </button>
          </div>
        </div>

        <ul>
          {tablas.map((tabla, indice) => {
            const est = estado(tabla);
            const abierta = Boolean(abiertas[tabla.nombre]);
            return (
              <li
                key={tabla.nombre}
                style={indice > 0 ? { borderTop: "1px solid var(--color-border)" } : undefined}
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <Casilla
                    checked={est.todas}
                    indeterminado={est.alguna}
                    onChange={() => marcarTabla(tabla.nombre, !est.todas)}
                    etiqueta={`Seleccionar ${tabla.nombre}`}
                  />
                  <button
                    type="button"
                    className="inline-flex min-w-0 flex-1 items-center gap-2 text-left"
                    title="Desglosar columnas"
                    aria-expanded={abierta}
                    onClick={() =>
                      setAbiertas((prev) => ({ ...prev, [tabla.nombre]: !prev[tabla.nombre] }))
                    }
                  >
                    <span
                      className="inline-flex shrink-0 text-[var(--color-text-muted)]"
                      style={{ transform: abierta ? "rotate(90deg)" : undefined }}
                    >
                      <IconChevron className="h-4 w-4" />
                    </span>
                    <span className="truncate text-[13px] font-semibold" title={tabla.nombre}>
                      {tabla.nombre}
                    </span>
                    <span className="ml-auto shrink-0 text-[12px] text-[var(--color-text-muted)]">
                      {tabla.filas == null ? "—" : `${nro(tabla.filas)} filas`}
                      {" · "}
                      {nro(est.n)}/{nro(tabla.columnas.length)} columnas
                    </span>
                  </button>
                </div>
                {abierta ? (
                  <div
                    className="grid grid-cols-1 gap-1.5 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    style={{ paddingLeft: "2.4rem" }}
                  >
                    {tabla.columnas.map((col) => (
                      <label key={col} className="inline-flex min-w-0 items-center gap-2 text-[12.5px]">
                        <Casilla
                          checked={Boolean(columnasOn[tabla.nombre]?.[col])}
                          onChange={() =>
                            marcarColumna(tabla.nombre, col, !columnasOn[tabla.nombre]?.[col])
                          }
                          etiqueta={`${tabla.nombre}.${col}`}
                        />
                        <span className="truncate" title={col}>
                          {col}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
