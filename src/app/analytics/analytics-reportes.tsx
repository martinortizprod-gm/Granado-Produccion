"use client";

import { useMemo, useState } from "react";
import { IconDownload } from "@/components/ui/icons";
import { DialogoInforme } from "@/components/ui/informe";
import {
  etiquetaPeriodo,
  fmtHs,
  fmtKg,
  fmtPct,
  rangoAnterior,
  rangoSemana,
  resumenAnalytics,
  resumenPlan,
  type JornadaAnalytics,
  type LineaPlanAnalytics,
} from "@/lib/analytics/logic";
import { hoyIso, primerDiaMes } from "@/lib/planificacion/logic";
import { armarInformeAnalytics, type InformeAnalytics } from "@/lib/analytics/exportar";
import { resumenStock, type DatosStockAnalytics } from "@/lib/analytics/stock";

type Props = {
  jornadas: JornadaAnalytics[];
  plan: LineaPlanAnalytics[];
  stock: DatosStockAnalytics;
};

type Plantilla = {
  id: "semanal" | "mensual" | "vencimientos";
  titulo: string;
  pie: string;
  desde: string;
  hasta: string;
  tab: "produccion" | "stock";
  lineas: { label: string; valor: string }[];
};

export function AnalyticsReportes({ jornadas, plan, stock }: Props) {
  const [informe, setInforme] = useState<InformeAnalytics | null>(null);
  const hoy = hoyIso();
  const semana = rangoSemana(hoy);
  const mes = { desde: primerDiaMes(hoy), hasta: hoy };

  const plantillas = useMemo<Plantilla[]>(() => {
    const semRes = resumenAnalytics(jornadas, semana.desde, semana.hasta);
    const mesRes = resumenAnalytics(jornadas, mes.desde, mes.hasta);
    const mesPlan = resumenPlan(plan, mesRes.diario, "Todos", mes.desde, mes.hasta, hoy);
    const stockRes = resumenStock(stock, {
      desde: semana.desde,
      hasta: semana.hasta,
      familia: "Todas",
      categoria: "Todos",
      producto: "Todos",
      hoy,
    });
    return [
      {
        id: "semanal",
        titulo: "Producción semanal",
        pie: "Lunes a hoy · kg, horas y paradas",
        desde: semana.desde,
        hasta: semana.hasta,
        tab: "produccion",
        lineas: [
          { label: "Período", valor: etiquetaPeriodo(semana.desde, semana.hasta) },
          { label: "Producción", valor: fmtKg(semRes.kgTotal) },
          { label: "Jornadas", valor: String(semRes.jornadas) },
          { label: "Paradas no prog.", valor: fmtHs(semRes.hsParadasNo) },
        ],
      },
      {
        id: "mensual",
        titulo: "Cierre mensual",
        pie: "Mes actual · cumplimiento, mix y causas",
        desde: mes.desde,
        hasta: mes.hasta,
        tab: "produccion",
        lineas: [
          { label: "Período", valor: etiquetaPeriodo(mes.desde, mes.hasta) },
          { label: "Producción", valor: fmtKg(mesRes.kgTotal) },
          {
            label: "Cumplimiento",
            valor: mesPlan.cumplimiento == null ? "Sin plan vigente" : fmtPct(mesPlan.cumplimiento),
          },
          { label: "Categoría top", valor: mesRes.porCategoria[0]?.nombre ?? "—" },
        ],
      },
      {
        id: "vencimientos",
        titulo: "Vencimientos",
        pie: "Saldo actual · vencidos y próximos 30 días",
        desde: semana.desde,
        hasta: semana.hasta,
        tab: "stock",
        lineas: [
          { label: "Vencidos", valor: String(stockRes.vencidos) },
          { label: "Vencen en 30 días", valor: String(stockRes.proximos) },
          { label: "Stock bajo", valor: String(stockRes.bajos) },
          { label: "Consumo de la semana", valor: fmtKg(stockRes.consumo) },
        ],
      },
    ];
  }, [jornadas, plan, stock, hoy, semana.desde, semana.hasta, mes.desde, mes.hasta]);

  function abrir(plantilla: Plantilla) {
    const resumen = resumenAnalytics(jornadas, plantilla.desde, plantilla.hasta);
    const anteriorRango = rangoAnterior(plantilla.desde, plantilla.hasta);
    const armado = armarInformeAnalytics({
      tab: plantilla.tab,
      desde: plantilla.desde,
      hasta: plantilla.hasta,
      categoria: "Todos",
      producto: "Todos",
      envase: "Todos",
      causa: null,
      familia: "Todas",
      comparar: plantilla.tab === "produccion",
      resumen,
      plan:
        plantilla.tab === "produccion"
          ? resumenPlan(plan, resumen.diario, "Todos", plantilla.desde, plantilla.hasta, hoy)
          : null,
      anterior:
        plantilla.tab === "produccion"
          ? resumenAnalytics(jornadas, anteriorRango.desde, anteriorRango.hasta)
          : null,
      stock,
    });
    if (armado) {
      setInforme({
        ...armado,
        titulo: `Data Analytics · ${plantilla.titulo}`,
        nombreInicial: `analytics_${plantilla.id}_${plantilla.desde}_${plantilla.hasta}`,
      });
    }
  }

  return (
    <div className="g-stack">
      <p className="text-[13px] text-[var(--color-text-muted)]">
        Plantillas listas para bajar. El envío automático por mail pide una tabla en la base; por ahora
        se generan acá, con la misma emisión de fecha y usuario.
      </p>
      <div className="grid gap-2 lg:grid-cols-3">
        {plantillas.map((item) => (
          <div key={item.id} className="g-card flex flex-col gap-3 p-3">
            <div>
              <p className="g-section-title">{item.titulo}</p>
              <p className="text-[12px] text-[var(--color-text-muted)]">{item.pie}</p>
            </div>
            <dl className="space-y-1.5">
              {item.lineas.map((linea) => (
                <div key={linea.label} className="flex justify-between gap-2 text-[13px]">
                  <dt className="text-[var(--color-text-muted)]">{linea.label}</dt>
                  <dd className="tabular-nums text-right">{linea.valor}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-auto flex gap-2">
              <button type="button" className="g-btn g-btn-primary g-btn-sm" onClick={() => abrir(item)}>
                <IconDownload className="h-4 w-4" />
                Excel / PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {informe ? (
        <DialogoInforme
          titulo={informe.titulo}
          nombreInicial={informe.nombreInicial}
          hoja={informe.hoja}
          encabezados={informe.encabezados}
          filas={informe.filas}
          filasPdf={informe.filasPdf}
          onCerrar={() => setInforme(null)}
        />
      ) : null}
    </div>
  );
}
