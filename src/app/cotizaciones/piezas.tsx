import { textoVariacion } from "@/lib/cotizaciones/logic";

export function fechaHoraVisible(valor: string) {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  const ar = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const dd = String(ar.getUTCDate()).padStart(2, "0");
  const mm = String(ar.getUTCMonth() + 1).padStart(2, "0");
  const hh = String(ar.getUTCHours()).padStart(2, "0");
  const mi = String(ar.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${ar.getUTCFullYear()} ${hh}:${mi}`;
}

export function Kpi({
  titulo,
  valor,
  pie,
}: {
  titulo: string;
  valor: string;
  pie: string;
}) {
  return (
    <div className="g-kpi">
      <p className="g-kpi-title">{titulo}</p>
      <p className="g-kpi-value">{valor}</p>
      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{pie}</p>
    </div>
  );
}

export function Variacion({ pct }: { pct: number | null }) {
  const txt = textoVariacion(pct);
  if (txt === "—") {
    return <span className="text-[var(--color-text-muted)]">—</span>;
  }
  const color =
    pct != null && pct > 0.05
      ? "var(--color-danger)"
      : pct != null && pct < -0.05
        ? "var(--color-success)"
        : "var(--color-text-secondary)";
  return (
    <span className="tabular-nums" style={{ color }}>
      {txt}
    </span>
  );
}
