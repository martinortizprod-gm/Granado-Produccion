"use client";

import { useState, type ReactNode } from "react";
import type { ParteIndicador, PuntoDiario, PuntoPlanReal } from "@/lib/analytics/logic";
import { fmtHs, fmtKg, fmtKgH, fmtPct } from "@/lib/analytics/logic";
import { fechaVisible } from "@/lib/solicitudes/logic";

const VERDE = "var(--color-primary)";
const PALETA = ["#0a4429", "#175cd3", "#c47a12", "#3d7a56", "#6b5b95", "#b85c5c", "#3d6b8a"];

function colorParte(nombre: string, indice: number) {
  if (nombre === "Sustituto Lácteo") return "#0a4429";
  if (nombre === "Premezcla") return "#175cd3";
  return PALETA[indice % PALETA.length];
}

function maximo(valores: number[]) {
  const tope = Math.max(0, ...valores);
  return tope <= 0.0005 ? 1 : tope;
}

function etiquetasEje(puntos: { etiqueta: string }[]) {
  if (puntos.length <= 8) return puntos.map((p, i) => ({ i, texto: p.etiqueta }));
  const paso = Math.ceil((puntos.length - 1) / 6);
  const out: { i: number; texto: string }[] = [];
  for (let i = 0; i < puntos.length; i += paso) {
    out.push({ i, texto: puntos[i].etiqueta });
  }
  const ultimo = puntos.length - 1;
  if (out[out.length - 1]?.i !== ultimo) {
    out.push({ i: ultimo, texto: puntos[ultimo].etiqueta });
  }
  return out;
}

export function GraficoKg({
  serie,
  onSeleccionar,
}: {
  serie: PuntoDiario[];
  onSeleccionar?: (punto: PuntoDiario) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 640;
  const h = 168;
  const padL = 42;
  const padR = 8;
  const padT = 12;
  const padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const max = maximo(serie.map((p) => p.kg));
  const n = Math.max(1, serie.length - 1);
  const puntos = serie.map((p, i) => {
    const x = padL + (serie.length <= 1 ? innerW / 2 : (i / n) * innerW);
    const y = padT + innerH - (p.kg / max) * innerH;
    return { x, y, p };
  });
  const linea = puntos.map((pt) => `${pt.x},${pt.y}`).join(" ");
  const area = `${padL},${padT + innerH} ${linea} ${padL + innerW},${padT + innerH}`;
  const marcas = etiquetasEje(serie);
  const banda = serie.length <= 1 ? innerW : innerW / n;
  const activo = hover != null ? puntos[hover] : null;

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full" role="img" aria-label="Producción diaria">
        <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="var(--color-border)" strokeWidth="1" />
        <line x1={padL} y1={padT + innerH} x2={padL + innerW} y2={padT + innerH} stroke="var(--color-border)" strokeWidth="1" />
        {[0.5, 1].map((f) => (
          <line
            key={f}
            x1={padL}
            x2={padL + innerW}
            y1={padT + innerH - f * innerH}
            y2={padT + innerH - f * innerH}
            stroke="var(--color-border)"
            strokeOpacity="0.45"
            strokeDasharray="3 4"
          />
        ))}
        <text x={4} y={padT + 4} className="fill-[var(--color-text-muted)]" fontSize="10">
          {fmtKg(max)}
        </text>
        <polygon points={area} fill="var(--color-primary)" fillOpacity="0.12" />
        <polyline points={linea} fill="none" stroke={VERDE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {activo ? (
          <line
            x1={activo.x}
            x2={activo.x}
            y1={padT}
            y2={padT + innerH}
            stroke={VERDE}
            strokeOpacity="0.25"
          />
        ) : null}
        {puntos.map((pt) => (
          <circle
            key={`p-${pt.p.fecha}`}
            cx={pt.x}
            cy={pt.y}
            r={hover != null && puntos[hover] === pt ? 4.5 : 2.6}
            fill={VERDE}
          />
        ))}
        {puntos.map((pt, i) => (
          <rect
            key={`h-${pt.p.fecha}`}
            x={pt.x - banda / 2}
            y={padT}
            width={Math.max(8, banda)}
            height={innerH}
            fill="transparent"
            className={onSeleccionar ? "cursor-pointer" : undefined}
            onMouseEnter={() => setHover(i)}
            onClick={() => onSeleccionar?.(pt.p)}
          />
        ))}
        {marcas.map((m) => (
          <text
            key={`${m.i}-${m.texto}`}
            x={puntos[m.i]?.x ?? padL}
            y={h - 4}
            textAnchor="middle"
            className="fill-[var(--color-text-muted)]"
            fontSize="10"
          >
            {m.texto}
          </text>
        ))}
      </svg>
      {activo ? (
        <div
          className="pointer-events-none absolute z-10 min-w-[8.5rem] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 shadow-[var(--shadow-md)]"
          style={{
            left: `${(activo.x / w) * 100}%`,
            top: `${Math.max(8, (activo.y / h) * 100 - 6)}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="text-[11px] font-semibold text-[var(--color-text)]">
            {activo.p.fecha.length === 7 ? activo.p.etiqueta : fechaVisible(activo.p.fecha)}
          </p>
          <p className="text-[12px] tabular-nums text-[var(--color-text)]">{fmtKg(activo.p.kg)}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {activo.p.jornadas} jornada{activo.p.jornadas === 1 ? "" : "s"}
            {activo.p.hsProductivas > 0.0005 ? ` · ${fmtKgH(activo.p.kg / activo.p.hsProductivas)}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function GraficoHoras({
  serie,
  onSeleccionar,
}: {
  serie: PuntoDiario[];
  onSeleccionar?: (punto: PuntoDiario) => void;
}) {
  const max = maximo(
    serie.map((p) =>
      Math.max(p.hsDisponibles, p.hsProductivas + p.hsParadasProg + p.hsParadasNo),
    ),
  );
  const marcas = etiquetasEje(serie);
  const mostrar = new Set(marcas.map((m) => m.i));

  return (
    <div className="flex h-44 gap-px px-1">
      {serie.map((punto, i) => {
        const total = Math.max(
          punto.hsProductivas + punto.hsParadasProg + punto.hsParadasNo,
          punto.hsDisponibles,
        );
        const alto = total > 0 ? Math.max(4, (total / max) * 100) : 0;
        const prod = total > 0 ? (punto.hsProductivas / total) * 100 : 0;
        const prog = total > 0 ? (punto.hsParadasProg / total) * 100 : 0;
        const no = total > 0 ? (punto.hsParadasNo / total) * 100 : 0;
        return (
          <div
            key={punto.fecha}
            className={`flex min-w-0 flex-1 flex-col ${onSeleccionar ? "cursor-pointer" : ""}`}
            onClick={() => onSeleccionar?.(punto)}
          >
            <div className="flex min-h-0 flex-1 items-end">
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px]"
                style={{ height: `${alto}%` }}
                title={`${punto.etiqueta}: ${fmtHs(punto.hsProductivas)} prod. · ${fmtHs(punto.hsParadasProg)} prog. · ${fmtHs(punto.hsParadasNo)} no prog.`}
              >
                <span style={{ height: `${prod}%`, background: "#0a4429" }} />
                <span style={{ height: `${prog}%`, background: "#c47a12" }} />
                <span style={{ height: `${no}%`, background: "#175cd3" }} />
              </div>
            </div>
            <span className={`mt-1 h-4 text-center text-[10px] text-[var(--color-text-muted)] ${mostrar.has(i) ? "" : "invisible"}`}>
              {punto.etiqueta}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function GraficoPlanReal({
  serie,
  onSeleccionar,
}: {
  serie: PuntoPlanReal[];
  onSeleccionar?: (punto: PuntoPlanReal) => void;
}) {
  const max = maximo(serie.map((p) => Math.max(p.kgPlan, p.kgReal)));
  const marcas = etiquetasEje(serie);
  const mostrar = new Set(marcas.map((m) => m.i));

  return (
    <div className="flex h-44 gap-1 px-1">
      {serie.map((punto, i) => (
        <div
          key={punto.fecha}
          className={`flex min-w-0 flex-1 flex-col ${onSeleccionar ? "cursor-pointer" : ""}`}
          onClick={() => onSeleccionar?.(punto)}
        >
          <div className="flex min-h-0 flex-1 items-end justify-center gap-px">
            <div
              className="w-1/2 min-w-[3px] rounded-t-[3px] bg-[var(--color-border)]"
              style={{ height: `${punto.kgPlan > 0 ? Math.max(4, (punto.kgPlan / max) * 100) : 0}%` }}
              title={`${punto.etiqueta} plan: ${fmtKg(punto.kgPlan)}`}
            />
            <div
              className="w-1/2 min-w-[3px] rounded-t-[3px]"
              style={{
                height: `${punto.kgReal > 0 ? Math.max(4, (punto.kgReal / max) * 100) : 0}%`,
                background: "#0a4429",
              }}
              title={`${punto.etiqueta} real: ${fmtKg(punto.kgReal)}`}
            />
          </div>
          <span className={`mt-1 h-4 text-center text-[10px] text-[var(--color-text-muted)] ${mostrar.has(i) ? "" : "invisible"}`}>
            {punto.etiqueta}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LeyendaPlan() {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-[var(--color-text-muted)]">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-[var(--color-border)]" />
        Plan
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm" style={{ background: "#0a4429" }} />
        Real
      </span>
    </div>
  );
}

export function LeyendaHoras() {
  const items = [
    { color: "#0a4429", texto: "Productivas" },
    { color: "#c47a12", texto: "Paradas prog." },
    { color: "#175cd3", texto: "Paradas no prog." },
  ];
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-[var(--color-text-muted)]">
      {items.map((item) => (
        <span key={item.texto} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: item.color }} />
          {item.texto}
        </span>
      ))}
    </div>
  );
}

export function PanelPartes({
  titulo,
  partes,
  unidad,
  extra,
  onSeleccionar,
}: {
  titulo: string;
  partes: ParteIndicador[];
  unidad: "kg" | "h" | "kg/día" | "un";
  extra?: boolean;
  onSeleccionar?: (nombre: string) => void;
}) {
  const max = maximo(partes.map((p) => p.valor));
  return (
    <div className="g-card flex h-full flex-col p-3">
      <p className="g-section-title mb-2">{titulo}</p>
      {partes.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">Sin datos para mostrar.</p>
      ) : (
        <ul className="space-y-2">
          {partes.map((parte, i) => {
            const detalle =
              extra
                ? `${fmtKg(parte.valor)}/día  ·  ${parte.extra} día${parte.extra === 1 ? "" : "s"}`
                : unidad === "h"
                  ? `${fmtHs(parte.valor)}   (${fmtPct(parte.porcentaje)})`
                  : unidad === "un"
                    ? `${fmtKg(parte.valor).replace(" kg", " un.")}   (${fmtPct(parte.porcentaje)})`
                    : `${fmtKg(parte.valor)}   (${fmtPct(parte.porcentaje)})`;
            return (
              <li
                key={parte.nombre}
                className={onSeleccionar ? "cursor-pointer rounded-md px-1 py-0.5 hover:bg-[var(--color-primary-soft)]" : undefined}
                onClick={() => onSeleccionar?.(parte.nombre)}
              >
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="g-truncate min-w-0" title={parte.nombre}>
                    {parte.nombre}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--color-text-muted)]">{detalle}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, (parte.valor / max) * 100)}%`,
                      background: colorParte(parte.nombre, i),
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PanelGrafico({
  titulo,
  pie,
  children,
}: {
  titulo: string;
  pie?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="g-card p-3">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <p className="g-section-title">{titulo}</p>
        {pie ? <div className="text-[11px] text-[var(--color-text-muted)]">{pie}</div> : null}
      </div>
      {children}
    </div>
  );
}
