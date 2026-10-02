"use client";

import { consultarConsumo } from "@/app/consultas-ia/actions";
import type { ResultadoConsultaIa } from "@/lib/consultas-ia/tipos";
import { nroDec } from "@/lib/produccion/logic";
import { fechaVisible } from "@/lib/solicitudes/logic";
import { useState } from "react";

const EJEMPLO = "¿Cuánto consumí del Ingrediente 1 y del Ingrediente 2 en septiembre?";

export function ConsultasIaClient({
  tieneClave,
  enPanel = false,
}: {
  tieneClave: boolean;
  enPanel?: boolean;
}) {
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoConsultaIa | null>(null);

  async function consultar() {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await consultarConsumo(pregunta);
      if (!respuesta.ok) {
        setResultado(null);
        setError(respuesta.error);
      } else {
        setResultado(respuesta.resultado);
      }
    } catch (err) {
      setResultado(null);
      setError(err instanceof Error ? err.message : "No se pudo consultar.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="g-stack">
      {enPanel ? (
        <p className="text-[12px] text-[var(--color-text-muted)]">
          Stock, movimientos, consumos, producción, planificación, horas, paradas, solicitudes y lotes.
        </p>
      ) : (
        <div>
          <h1 className="g-page-title">Consultas IA</h1>
          <p className="g-page-subtitle">
            Stock, movimientos, consumos, producción, planificación, horas, paradas, solicitudes y lotes.
          </p>
        </div>
      )}

      {!tieneClave ? (
        <p className="g-alert g-alert-warning">
          Falta la clave de Gemini. Agregá GEMINI_API_KEY en .env.local y reiniciá el servidor.
        </p>
      ) : null}

      <section className="g-card flex flex-col gap-3 p-3">
        <label className="g-label" htmlFor="pregunta-ia">
          Pregunta
        </label>
        <textarea
          id="pregunta-ia"
          className="g-input h-auto min-h-[88px] py-2"
          placeholder={EJEMPLO}
          value={pregunta}
          maxLength={800}
          disabled={!tieneClave || cargando}
          onChange={(event) => setPregunta(event.target.value)}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="g-btn g-btn-primary"
            disabled={!tieneClave || cargando || !pregunta.trim()}
            onClick={() => void consultar()}
          >
            {cargando ? "Consultando…" : "Consultar"}
          </button>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            Ejemplo: {EJEMPLO}
          </p>
        </div>
      </section>

      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}

      {resultado ? (
        <section className="g-card flex flex-col gap-3 p-3">
          <p className="text-[14px] text-[var(--color-text)]">{resultado.resumen}</p>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            {resultado.desde && resultado.hasta
              ? `${fechaVisible(resultado.desde)} al ${fechaVisible(resultado.hasta)}. `
              : ""}
            {resultado.fuente}
            {resultado.redactoIa
              ? " El texto lo redactó Gemini; los datos los calculó el sistema."
              : " El texto y los datos los armó el sistema."}
          </p>
          {resultado.barras?.length ? (
            <div className="flex flex-col gap-2">
              {resultado.barras.map((barra) => {
                const maximo = Math.max(...resultado.barras!.map((item) => item.valor), 0);
                const ancho = maximo > 0 ? Math.max(barra.valor > 0 ? 4 : 0, (barra.valor / maximo) * 100) : 0;
                return (
                  <div key={barra.etiqueta}>
                    <div className="mb-1 flex justify-between gap-2 text-[12px]">
                      <span className="min-w-0 truncate" title={barra.etiqueta}>
                        {barra.etiqueta}
                      </span>
                      <span className="shrink-0">{nroDec(barra.valor, 3)} kg</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${ancho}%`, background: "var(--color-primary)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="g-table-wrap">
            <div className="g-table-scroll">
              <table className="g-table">
                <thead>
                  <tr>
                    {resultado.columnas.map((columna) => (
                      <th key={columna}>{columna}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.filas.length ? (
                    resultado.filas.map((fila, index) => (
                      <tr key={index}>
                        {fila.map((celda, i) => (
                          <td key={resultado.columnas[i] ?? i}>{celda}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={resultado.columnas.length}>Sin registros en ese período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
