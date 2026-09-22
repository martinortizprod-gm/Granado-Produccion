"use client";

import { FormEvent, useState, useTransition } from "react";
import {
  guardarCapacidades,
  guardarHorarios,
  guardarParadas,
  guardarRendimientos,
} from "@/app/planificacion/actions";
import {
  capacidadDe,
  CapacidadPlan,
  ConfigPlan,
  DIAS_SEMANA,
  HorarioPlan,
  ParadaPlan,
  RendimientoPlan,
} from "@/lib/planificacion/logic";
import { clave } from "@/lib/solicitudes/logic";

export type TipoPanel = "rendimientos" | "capacidades" | "horarios" | "paradas";

const TITULOS: Record<TipoPanel, { titulo: string; subtitulo: string }> = {
  rendimientos: {
    titulo: "Producción estimada por hora",
    subtitulo:
      "Pallets por hora según la cantidad de operarios y la categoría. Estos valores alimentan la capacidad de línea y la producción planificada.",
  },
  capacidades: {
    titulo: "Capacidad de línea estimada",
    subtitulo:
      "Los kg por pallet y por batch se cargan a mano. Los pallets por hora, kg por hora y batch por hora se calculan con la cantidad de operarios seleccionada.",
  },
  horarios: {
    titulo: "Disponibilidad horaria y paradas programadas",
    subtitulo:
      "Las horas contempladas se cargan por día. Las paradas se traen de la estimación por día y cantidad de operarios, y el total se descuenta de las horas disponibles.",
  },
  paradas: {
    titulo: "Estimación de horas paradas programadas",
    subtitulo:
      "Horas de parada por día y cantidad de operarios. Podés editar los valores, agregar una causa nueva o agregar otra cantidad de operarios.",
  },
};

function num(valor: string) {
  const n = Number(String(valor).trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function PanelesPlan({
  tipo,
  config,
  operarios,
  mes,
  onCerrar,
  onListo,
}: {
  tipo: TipoPanel;
  config: ConfigPlan;
  operarios: number;
  mes: string;
  onCerrar: () => void;
  onListo: (aviso: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const info = TITULOS[tipo];

  function correr(tarea: () => Promise<{ aviso: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const resultado = await tarea();
        onListo(resultado.aviso);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  return (
    <form
      className="g-card space-y-3 p-3"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
      }}
    >
      <div>
        <p className="g-section-title">{info.titulo}</p>
        <p className="text-[12px] text-[var(--color-text-muted)]">{info.subtitulo}</p>
      </div>
      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {tipo === "rendimientos" ? (
        <EditorRendimientos config={config} pending={pending} onGuardar={(items) => correr(() => guardarRendimientos(mes, operarios, items))} />
      ) : null}
      {tipo === "capacidades" ? (
        <EditorCapacidades
          config={config}
          operarios={operarios}
          pending={pending}
          onGuardar={(items) => correr(() => guardarCapacidades(mes, operarios, items))}
        />
      ) : null}
      {tipo === "horarios" ? (
        <EditorHorarios
          config={config}
          operarios={operarios}
          pending={pending}
          onGuardar={(items) => correr(() => guardarHorarios(mes, operarios, items))}
        />
      ) : null}
      {tipo === "paradas" ? (
        <EditorParadas config={config} pending={pending} onGuardar={(items) => correr(() => guardarParadas(mes, operarios, items))} />
      ) : null}
      <div className="flex justify-end">
        <button type="button" className="g-btn g-btn-secondary" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </form>
  );
}

function EditorRendimientos({
  config,
  pending,
  onGuardar,
}: {
  config: ConfigPlan;
  pending: boolean;
  onGuardar: (items: RendimientoPlan[]) => void;
}) {
  const inicial = [...new Set(config.rendimientos.map((item) => item.cantidad_operarios))].sort((a, b) => a - b);
  const [filas, setFilas] = useState(inicial.length ? inicial : [1]);
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const item of config.rendimientos) mapa[`${item.cantidad_operarios}|${item.categoria}`] = String(item.pallets_hora);
    return mapa;
  });
  return (
    <div className="space-y-2">
      <div className="g-table-scroll">
        <table className="g-table">
          <thead>
            <tr>
              <th>Cantidad operarios</th>
              {config.categorias.map((cat) => (
                <th key={cat}>{cat}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((op) => (
              <tr key={op}>
                <td>{op}</td>
                {config.categorias.map((cat) => {
                  const llave = `${op}|${cat}`;
                  return (
                    <td key={cat}>
                      <input
                        className="g-input"
                        value={valores[llave] ?? "0"}
                        onChange={(e) => setValores({ ...valores, [llave]: e.target.value })}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          className="g-btn g-btn-secondary"
          onClick={() => setFilas([...filas, (filas.length ? Math.max(...filas) : 0) + 1])}
        >
          Agregar cantidad de operarios
        </button>
        <button
          type="button"
          className="g-btn g-btn-primary"
          disabled={pending}
          onClick={() =>
            onGuardar(
              filas.flatMap((op) =>
                config.categorias.map((cat) => ({
                  id: config.rendimientos.find((item) => item.cantidad_operarios === op && clave(item.categoria) === clave(cat))?.id ?? null,
                  cantidad_operarios: op,
                  categoria: cat,
                  pallets_hora: num(valores[`${op}|${cat}`] ?? "0"),
                })),
              ),
            )
          }
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function EditorCapacidades({
  config,
  operarios,
  pending,
  onGuardar,
}: {
  config: ConfigPlan;
  operarios: number;
  pending: boolean;
  onGuardar: (items: CapacidadPlan[]) => void;
}) {
  const [filas, setFilas] = useState(() =>
    config.capacidades.map((item) => ({
      id: item.id,
      categoria: item.categoria,
      kg_por_pallet: String(item.kg_por_pallet),
      kg_por_batch: String(item.kg_por_batch),
    })),
  );
  const vista: ConfigPlan = {
    ...config,
    capacidades: filas.map((item) => ({
      id: item.id,
      categoria: item.categoria,
      kg_por_pallet: num(item.kg_por_pallet),
      kg_por_batch: num(item.kg_por_batch),
    })),
  };
  return (
    <div className="space-y-2">
      <div className="g-table-scroll">
        <table className="g-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>kg/pallet</th>
              <th>kg/batch</th>
              <th>Pallets/hora</th>
              <th>Kg/hora</th>
              <th>Batch/hora</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, indice) => {
              const calc = capacidadDe(vista, fila.categoria, operarios);
              return (
                <tr key={indice}>
                  <td>
                    <input
                      className="g-input"
                      value={fila.categoria}
                      onChange={(e) => {
                        const copia = [...filas];
                        copia[indice] = { ...fila, categoria: e.target.value };
                        setFilas(copia);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      className="g-input"
                      value={fila.kg_por_pallet}
                      onChange={(e) => {
                        const copia = [...filas];
                        copia[indice] = { ...fila, kg_por_pallet: e.target.value };
                        setFilas(copia);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      className="g-input"
                      value={fila.kg_por_batch}
                      onChange={(e) => {
                        const copia = [...filas];
                        copia[indice] = { ...fila, kg_por_batch: e.target.value };
                        setFilas(copia);
                      }}
                    />
                  </td>
                  <td className="tabular-nums">{calc ? calc.pallets_hora.toLocaleString("es-AR") : "—"}</td>
                  <td className="tabular-nums">{calc ? calc.kg_hora.toLocaleString("es-AR") : "—"}</td>
                  <td className="tabular-nums">{calc ? calc.batch_hora.toLocaleString("es-AR") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          className="g-btn g-btn-secondary"
          onClick={() => setFilas([...filas, { id: null, categoria: "", kg_por_pallet: "0", kg_por_batch: "0" }])}
        >
          Agregar categoría
        </button>
        <button
          type="button"
          className="g-btn g-btn-primary"
          disabled={pending}
          onClick={() =>
            onGuardar(
              filas.map((fila) => ({
                id: fila.id,
                categoria: fila.categoria,
                kg_por_pallet: num(fila.kg_por_pallet),
                kg_por_batch: num(fila.kg_por_batch),
              })),
            )
          }
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function EditorHorarios({
  config,
  operarios,
  pending,
  onGuardar,
}: {
  config: ConfigPlan;
  operarios: number;
  pending: boolean;
  onGuardar: (items: HorarioPlan[]) => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const dia of DIAS_SEMANA) {
      const actual = config.horarios.find((item) => clave(item.dia_semana) === clave(dia));
      mapa[dia] = String(actual?.horas_disponibles ?? 0);
    }
    return mapa;
  });
  return (
    <div className="space-y-2">
      <div className="g-table-scroll">
        <table className="g-table">
          <thead>
            <tr>
              <th>Días</th>
              <th>Horas contempladas</th>
              {config.causas.map((causa) => (
                <th key={causa}>{causa}</th>
              ))}
              <th>Total paradas</th>
              <th>Productivas</th>
            </tr>
          </thead>
          <tbody>
            {DIAS_SEMANA.map((dia) => {
              const detalle = Object.fromEntries(
                config.paradas
                  .filter((item) => clave(item.dia_semana) === clave(dia) && item.cantidad_operarios === operarios)
                  .map((item) => [item.causa, item.horas]),
              );
              const total = config.causas.reduce((suma, causa) => suma + (detalle[causa] ?? 0), 0);
              const disp = num(valores[dia] ?? "0");
              const productivas = disp > 0 ? Math.max(0, disp - total) : 0;
              return (
                <tr key={dia}>
                  <td>{dia}</td>
                  <td>
                    <input
                      className="g-input"
                      value={valores[dia] ?? "0"}
                      onChange={(e) => setValores({ ...valores, [dia]: e.target.value })}
                    />
                  </td>
                  {config.causas.map((causa) => (
                    <td key={causa} className="tabular-nums">
                      {(detalle[causa] ?? 0).toLocaleString("es-AR")}
                    </td>
                  ))}
                  <td className="tabular-nums">{total.toLocaleString("es-AR")}</td>
                  <td className="tabular-nums">{productivas.toLocaleString("es-AR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          className="g-btn g-btn-primary"
          disabled={pending}
          onClick={() =>
            onGuardar(
              DIAS_SEMANA.map((dia) => ({
                id: config.horarios.find((item) => clave(item.dia_semana) === clave(dia))?.id ?? null,
                dia_semana: dia,
                horas_disponibles: num(valores[dia] ?? "0"),
              })),
            )
          }
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function EditorParadas({
  config,
  pending,
  onGuardar,
}: {
  config: ConfigPlan;
  pending: boolean;
  onGuardar: (items: ParadaPlan[]) => void;
}) {
  const inicialOps = [...new Set(config.paradas.map((item) => item.cantidad_operarios))].sort((a, b) => a - b);
  const [causas, setCausas] = useState(config.causas);
  const [ops, setOps] = useState(inicialOps.length ? inicialOps : [1]);
  const [causaNueva, setCausaNueva] = useState("");
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const item of config.paradas) {
      mapa[`${clave(item.dia_semana)}|${item.cantidad_operarios}|${clave(item.causa)}`] = String(item.horas);
    }
    return mapa;
  });

  function agregarCausa() {
    const nombre = causaNueva.trim();
    if (!nombre || causas.some((causa) => clave(causa) === clave(nombre))) return;
    setCausas([...causas, nombre]);
    setCausaNueva("");
  }

  return (
    <div className="space-y-2">
      <div className="g-table-scroll">
        <table className="g-table">
          <thead>
            <tr>
              <th>Día</th>
              <th>Cantidad operarios</th>
              {causas.map((causa) => (
                <th key={causa}>{causa}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIAS_SEMANA.flatMap((dia) =>
              ops.map((op, indice) => (
                <tr key={`${dia}-${op}`}>
                  <td>{indice === 0 ? dia : ""}</td>
                  <td>{op}</td>
                  {causas.map((causa) => {
                    const llave = `${clave(dia)}|${op}|${clave(causa)}`;
                    return (
                      <td key={causa}>
                        <input
                          className="g-input"
                          value={valores[llave] ?? "0"}
                          onChange={(e) => setValores({ ...valores, [llave]: e.target.value })}
                        />
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <label>
            <span className="g-label">Nueva causa</span>
            <input className="g-input" value={causaNueva} onChange={(e) => setCausaNueva(e.target.value)} />
          </label>
          <button type="button" className="g-btn g-btn-secondary" onClick={agregarCausa}>
            Agregar causa
          </button>
          <button
            type="button"
            className="g-btn g-btn-secondary"
            onClick={() => setOps([...ops, (ops.length ? Math.max(...ops) : 0) + 1])}
          >
            Agregar cantidad de operarios
          </button>
        </div>
        <button
          type="button"
          className="g-btn g-btn-primary"
          disabled={pending}
          onClick={() =>
            onGuardar(
              DIAS_SEMANA.flatMap((dia) =>
                ops.flatMap((op) =>
                  causas.map((causa) => ({
                    id:
                      config.paradas.find(
                        (item) =>
                          clave(item.dia_semana) === clave(dia) &&
                          item.cantidad_operarios === op &&
                          clave(item.causa) === clave(causa),
                      )?.id ?? null,
                    dia_semana: dia,
                    cantidad_operarios: op,
                    causa,
                    horas: num(valores[`${clave(dia)}|${op}|${clave(causa)}`] ?? "0"),
                  })),
                ),
              ),
            )
          }
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
