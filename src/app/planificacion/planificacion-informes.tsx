"use client";

import { IconClose, IconDownload, IconFile } from "@/components/ui/icons";
import { descargarExcel } from "@/lib/informes/descarga";
import { DatosPlan, etiquetaMes, HorasRealesDia } from "@/lib/planificacion/logic";
import { fechaVisible } from "@/lib/solicitudes/logic";

function nro(valor: number, decimales = 1) {
  const n = Number(valor) || 0;
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n).toLocaleString("es-AR");
  return n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function PanelHoras({
  tipo,
  datos,
  onCerrar,
}: {
  tipo: "resumen" | "analisis";
  datos: DatosPlan;
  onCerrar: () => void;
}) {
  if (tipo === "analisis") {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
        <div className="g-card my-4 w-full max-w-6xl p-4">
          <VistaAnalisis datos={datos} onCerrar={onCerrar} />
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="g-card my-4 w-full max-w-5xl space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="g-section-title">Resumen de horas</p>
            <p className="text-[12px] text-[var(--color-text-muted)]">{datos.etiqueta}</p>
          </div>
          <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Cerrar" aria-label="Cerrar" onClick={onCerrar}>
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <TablaResumen datos={datos} />
      </div>
    </div>
  );
}

function muestra(diaPlanDisponibles: number, real: HorasRealesDia | undefined) {
  return diaPlanDisponibles > 0.0005 && !!real?.tieneRegistro;
}

function TablaResumen({ datos }: { datos: DatosPlan }) {
  const reales = new Map(datos.resumenHoras.dias.map((dia) => [dia.fecha, dia]));
  let disp = 0;
  let prod = 0;
  let prog = 0;
  let noProg = 0;
  let kg = 0;
  for (const dia of datos.dias) {
    const real = reales.get(dia.fecha);
    disp += dia.horas_disponibles;
    noProg += real?.noProgramadas ?? 0;
    if (muestra(dia.horas_disponibles, real)) {
      prod += real?.productivas ?? 0;
      prog += real?.programadas ?? 0;
      kg += real?.kg ?? 0;
    }
  }
  const rend = prod > 0.0005 ? kg / prod : null;

  function guardar() {
    descargarExcel(
      `resumen_horas_${datos.mes.slice(0, 7)}`,
      "Resumen horas",
      ["Día", "Fecha", "Categoría", "Hs disp.", "Hs prod.", "Hs pa. prog.", "Hs pa. no prog.", "Producción (kg)", "Rendimiento (kg/h)"],
      [
        ...datos.dias.map((dia) => {
          const real = reales.get(dia.fecha);
          const visible = muestra(dia.horas_disponibles, real);
          return [
            dia.dia_semana,
            fechaVisible(dia.fecha),
            visible ? real?.categoria || "" : "",
            dia.horas_disponibles,
            visible ? real?.productivas ?? 0 : "",
            visible ? real?.programadas ?? 0 : "",
            real?.noProgramadas ?? 0,
            visible ? real?.kg ?? 0 : "",
            visible && real && real.productivas > 0.0005 ? real.kg / real.productivas : "",
          ];
        }),
        ["Total", "", "", disp, prod, prog, noProg, kg, rend ?? ""],
      ],
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <button type="button" className="g-btn g-btn-secondary" onClick={guardar}>
          <IconDownload className="h-4 w-4" />
          Excel
        </button>
      </div>
      <div className="g-table-scroll">
        <table className="g-table">
          <thead>
            <tr>
              <th>Día</th>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Hs disp.</th>
              <th>Hs prod.</th>
              <th>Hs pa. prog.</th>
              <th>Hs pa. no prog.</th>
              <th>Producción (kg)</th>
              <th>Rendimiento (kg/h)</th>
            </tr>
          </thead>
          <tbody>
            {datos.dias.map((dia) => {
              const real = reales.get(dia.fecha);
              const visible = muestra(dia.horas_disponibles, real);
              const rendimiento = visible && real && real.productivas > 0.0005 ? real.kg / real.productivas : null;
              return (
                <tr key={dia.fecha}>
                  <td>{dia.dia_semana}</td>
                  <td>{fechaVisible(dia.fecha)}</td>
                  <td>{visible ? real?.categoria || "—" : "—"}</td>
                  <td className="tabular-nums">{nro(dia.horas_disponibles)}</td>
                  <td className="tabular-nums">{visible && real ? nro(real.productivas) : "—"}</td>
                  <td className="tabular-nums">{visible && real ? nro(real.programadas) : "—"}</td>
                  <td className="tabular-nums">{nro(real?.noProgramadas ?? 0)}</td>
                  <td className="tabular-nums">{visible && real ? nro(real.kg) : "—"}</td>
                  <td className="tabular-nums">{rendimiento == null ? "—" : nro(rendimiento, 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {datos.resumenHoras.porCategoria.length ? (
        <div>
          <p className="mb-1 text-[13px] font-semibold">Rendimiento promedio por categoría</p>
          <div className="g-table-scroll">
            <table className="g-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Producción (kg)</th>
                  <th>Hs productivas</th>
                  <th>Rendimiento (kg/h)</th>
                </tr>
              </thead>
              <tbody>
                {datos.resumenHoras.porCategoria.map((item) => (
                  <tr key={item.categoria}>
                    <td>{item.categoria}</td>
                    <td className="tabular-nums">{nro(item.kg)}</td>
                    <td className="tabular-nums">{nro(item.hs)}</td>
                    <td className="tabular-nums">{item.hs > 0.0005 ? nro(item.kg / item.hs, 2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}

function VistaAnalisis({ datos, onCerrar }: { datos: DatosPlan; onCerrar: () => void }) {
  const analisis = datos.analisis;
  const maxBarra = Math.max(1, ...analisis.composicion.map((item) => item.horas));
  const coloresBarra = ["#3D7A56", "#2F6FED", "#F0A04B", "#C4A35A"];
  const coloresTorta = ["#2F6FED", "#F0A04B", "#3D7A56", "#8AAB96", "#3D6B8A", "#B85C5C", "#C47B2B"];
  const coloresGantt = ["#3D7A56", "#2F6FED", "#F0A04B", "#8AAB96", "#3D6B8A", "#C47B2B", "#B85C5C", "#6B8F71"];
  const causasGantt = causasDelGantt(analisis.eventos);
  const tarjetas = [
    { titulo: "Disponibles", valor: analisis.disponibles, color: "#3D7A56" },
    { titulo: "Productivas", valor: analisis.productivas, color: "#2F6FED" },
    { titulo: "Paradas prog.", valor: analisis.paradasProgramadas, color: "#F0A04B" },
    { titulo: "Paradas no prog.", valor: analisis.paradasNoProgramadas, color: "#C47B2B" },
    { titulo: "Pendientes", valor: analisis.pendientes, color: "#C4A35A" },
  ];

  function guardar() {
    const meses = analisis.meses;
    descargarExcel(
      `analisis_horas_${datos.mes.slice(0, 7)}`,
      "Analisis horas",
      ["Concepto", "Horas", "Porcentaje"],
      [
        ...analisis.composicion.map((item) => [item.nombre, item.horas, item.porcentaje]),
        ...analisis.tipoParadas.map((item) => [item.nombre, item.horas, item.porcentaje]),
        ...analisis.causas.map((item) => [item.nombre, item.horas, item.porcentaje]),
        [],
        ["Causa", ...meses.map((mes) => etiquetaMes(mes))],
        ...causasGantt.map((causa) => [
          causa,
          ...meses.map((mes) => horasCausaMes(analisis.eventos, causa, mes) || ""),
        ]),
      ],
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[18px] font-bold tracking-wide">ANÁLISIS DE HORAS — {analisis.etiqueta.toUpperCase()}</h2>
        <div className="flex gap-1">
          <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Guardar" aria-label="Guardar" onClick={guardar}>
            <IconFile className="h-4 w-4" />
          </button>
          <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Cerrar" aria-label="Cerrar" onClick={onCerrar}>
            <IconClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        {tarjetas.map((item) => (
          <div key={item.titulo} className="g-card border-2 p-3" style={{ borderColor: "var(--color-border-strong)" }}>
            <p className="text-[11px] font-semibold tracking-wide text-[var(--color-text-muted)]">{item.titulo.toUpperCase()}</p>
            <p className="text-[26px] leading-tight font-semibold" style={{ color: item.color }}>
              {nro(item.valor, 2)} hs
            </p>
          </div>
        ))}
      </div>

      <div className="g-card border-2 p-3" style={{ borderColor: "var(--color-border-strong)" }}>
        <p className="mb-3 text-[13px] font-semibold">Composición de horas</p>
        <div className="space-y-2">
          {analisis.composicion.map((item, indice) => (
            <div key={item.nombre} className="grid grid-cols-[130px_1fr] items-center gap-2">
              <span className="text-right text-[12px]">{item.nombre}</span>
              <div className="flex items-center gap-2">
                <div
                  className="h-5 rounded-sm"
                  style={{
                    width: `${Math.max(item.horas > 0 ? 4 : 0, (item.horas / maxBarra) * 100)}%`,
                    background: coloresBarra[indice % coloresBarra.length],
                  }}
                />
                <span className="shrink-0 text-[12px] tabular-nums">
                  {nro(item.horas, 2)} ({nro(item.porcentaje, 1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-[var(--color-text-muted)]">hs</p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Rosca titulo="Paradas programadas vs no programadas" partes={analisis.tipoParadas} colores={coloresTorta} />
        <Rosca titulo="Causas de paradas no programadas" partes={analisis.causas} colores={coloresTorta} />
      </div>

      <div className="g-card border-2 p-3" style={{ borderColor: "var(--color-border-strong)" }}>
        <p className="mb-3 text-[13px] font-semibold">Gantt de causas no programadas ({analisis.periodoGantt})</p>
        {causasGantt.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-muted)]">Sin paradas no programadas en el período.</p>
        ) : (
          <div
            className="grid items-center gap-y-2"
            style={{ gridTemplateColumns: `150px repeat(${analisis.meses.length}, minmax(0, 1fr))` }}
          >
            {causasGantt.map((causa, indice) => (
              <div key={causa} className="contents">
                <span className="pr-2 text-right text-[12px] leading-tight">{causa}</span>
                {analisis.meses.map((mes) => {
                  const horas = horasCausaMes(analisis.eventos, causa, mes);
                  return (
                    <div key={`${causa}-${mes}`} className="border-l border-dashed border-[var(--color-border)] px-1">
                      {horas > 0.0005 ? (
                        <div
                          className="rounded px-1 py-1 text-center text-[11px] font-semibold text-white"
                          style={{ background: coloresGantt[indice % coloresGantt.length] }}
                        >
                          {nro(horas, 1)}
                        </div>
                      ) : (
                        <div className="h-6" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <span />
            {analisis.meses.map((mes) => (
              <span key={mes} className="pt-1 text-center text-[11px] text-[var(--color-text-muted)]">
                {etiquetaMes(mes)}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)]">
        Mes: {analisis.etiqueta} · Gantt: {analisis.periodoGantt} · Fuente: planificación mensual, producción y paradas no programadas
      </p>
    </div>
  );
}

function causasDelGantt(eventos: DatosPlan["analisis"]["eventos"]) {
  const totales = new Map<string, number>();
  for (const evento of eventos) totales.set(evento.causa, (totales.get(evento.causa) ?? 0) + evento.horas);
  return [...totales.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).map(([causa]) => causa);
}

function horasCausaMes(eventos: DatosPlan["analisis"]["eventos"], causa: string, mes: string) {
  const ym = mes.slice(0, 7);
  return eventos
    .filter((evento) => evento.causa === causa && evento.fecha.slice(0, 7) === ym)
    .reduce((suma, evento) => suma + evento.horas, 0);
}

function Rosca({
  titulo,
  partes,
  colores,
}: {
  titulo: string;
  partes: { nombre: string; horas: number; porcentaje: number }[];
  colores: string[];
}) {
  const radio = 36;
  const circunferencia = 2 * Math.PI * radio;
  let offset = 0;
  const visibles = partes.filter((parte) => parte.horas > 0.0005);
  return (
    <div className="g-card border-2 p-3" style={{ borderColor: "var(--color-border-strong)" }}>
      <p className="mb-2 text-[13px] font-semibold">{titulo}</p>
      {visibles.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">Sin datos</p>
      ) : (
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0">
            <circle cx="50" cy="50" r={radio} fill="none" stroke="var(--color-border)" strokeWidth="16" />
            {visibles.map((parte, indice) => {
              const largo = (parte.porcentaje / 100) * circunferencia;
              const trazo = (
                <circle
                  key={parte.nombre}
                  cx="50"
                  cy="50"
                  r={radio}
                  fill="none"
                  stroke={colores[indice % colores.length]}
                  strokeWidth="16"
                  strokeDasharray={`${largo} ${circunferencia - largo}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 50 50)"
                />
              );
              offset += largo;
              return trazo;
            })}
          </svg>
          <div className="space-y-1 text-[12px]">
            {visibles.map((parte, indice) => (
              <p key={parte.nombre} className="flex items-start gap-1.5">
                <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colores[indice % colores.length] }} />
                <span>
                  {parte.nombre}
                  <br />
                  {nro(parte.horas, 1)} hs ({nro(parte.porcentaje, 1)}%)
                </span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
