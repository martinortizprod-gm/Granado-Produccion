"use client";

import { FormEvent, ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  alternarContempla,
  asignarCategoria,
  eliminarDia,
  generarMes,
  guardarDia,
  recalcularMes,
} from "@/app/planificacion/actions";
import { DialogoInforme } from "@/components/ui/informe";
import { IconChart, IconDownload, IconFile, IconList } from "@/components/ui/icons";
import { PanelHoras } from "@/app/planificacion/planificacion-informes";
import { PanelesPlan, TipoPanel } from "@/app/planificacion/planificacion-paneles";
import { RowDeleteButton, RowEditButton } from "@/components/ui/record-detail";
import {
  AsignacionDia,
  DatosPlan,
  DiaPlan,
  estimar,
  horasDisponibles,
  horasParadas,
  hoyIso,
  mesDesplazado,
  paradasDe,
} from "@/lib/planificacion/logic";
import { fechaVisible } from "@/lib/solicitudes/logic";

function filasPlan(datos: DatosPlan): (string | number | null)[][] {
  const filas = datos.dias.map((dia) => [
    dia.contempla ? "Sí" : "No",
    dia.dia_semana,
    fechaVisible(dia.fecha),
    dia.horas_disponibles,
    dia.horas_paradas,
    dia.horas_productivas,
    dia.etiqueta_categorias,
    dia.pallets_plan || "",
    dia.kg_plan || "",
    dia.pallets_reales || "",
    dia.kg_reales || "",
    dia.desvio_pct == null ? "" : dia.desvio_pct,
    dia.observaciones,
  ]);
  filas.push([
    "",
    "TOTAL",
    "",
    datos.resumen.horas_disponibles,
    datos.resumen.horas_paradas,
    datos.resumen.horas_productivas,
    "",
    datos.resumen.pallets_plan,
    datos.resumen.kg_plan,
    datos.resumen.pallets_reales,
    datos.resumen.kg_reales,
    datos.resumen.desvio_pct == null ? "" : datos.resumen.desvio_pct,
    "",
  ]);
  return filas;
}

function nro(valor: number, decimales = 0) {
  const n = Number(valor) || 0;
  if (decimales === 0 || Math.abs(n - Math.round(n)) < 0.05) {
    return Math.round(n).toLocaleString("es-AR");
  }
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

function textoDesvio(valor: number | null) {
  if (valor == null) return "—";
  return `${valor > 0 ? "+" : ""}${nro(valor, 1)}%`;
}

function ruta(mes: string, ops?: number) {
  const params = new URLSearchParams();
  params.set("mes", mes.slice(0, 7));
  if (ops && ops > 0) params.set("ops", String(ops));
  return `/planificacion?${params.toString()}`;
}

export function PlanificacionClient({
  datos,
  puedeEditar,
}: {
  datos: DatosPlan;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [edicion, setEdicion] = useState(false);
  const [panel, setPanel] = useState<TipoPanel | null>(null);
  const [formFecha, setFormFecha] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [exportar, setExportar] = useState(false);
  const [panelHoras, setPanelHoras] = useState<"resumen" | "analisis" | null>(null);
  const resumen = datos.resumen;
  const completo = datos.dias.length > 0 && resumen.dias_planificados >= datos.dias.length;
  const faltantes = datos.dias.length - resumen.dias_planificados;
  const formDia = datos.dias.find((dia) => dia.fecha === formFecha) ?? null;

  function correr(tarea: () => Promise<{ aviso: string }>) {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        const resultado = await tarea();
        setAviso(resultado.aviso);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function cambiarOperarios(valor: string) {
    const elegidos = Number(valor);
    if (!elegidos || elegidos === datos.operarios) return;
    if (resumen.dias_planificados === 0) {
      router.push(ruta(datos.mes, elegidos));
      return;
    }
    const seguir = confirm(
      `¿Recalcular las horas y la producción planificada de ${datos.etiqueta} con ${elegidos} operarios?\n\nSe mantienen las categorías, las observaciones y lo ya producido.`,
    );
    if (!seguir) return;
    correr(async () => {
      const resultado = await recalcularMes(datos.mes, elegidos);
      router.replace(ruta(datos.mes, elegidos));
      return resultado;
    });
  }

  function accionPlan() {
    if (edicion) {
      setEdicion(false);
      setAviso("Edición del plan finalizada.");
      return;
    }
    if (completo) {
      setEdicion(true);
      setFormFecha(null);
      setAviso("Modo edición: Hs = día laboral. Producto calcula pallets y kg planificados.");
      return;
    }
    if (faltantes <= 0) return;
    const seguir = confirm(
      `¿Crear los ${faltantes} día(s) que faltan de ${datos.etiqueta} con ${datos.operarios} operarios?\n\nLas horas se toman de la disponibilidad horaria y de las paradas programadas.\nSábados y domingos quedan sin marcar (Hs) porque no tienen horas laborales.`,
    );
    if (!seguir) return;
    correr(() => generarMes(datos.mes, datos.operarios));
  }

  function onContempla(dia: DiaPlan) {
    const nuevo = !dia.contempla;
    if (!nuevo && dia.tiene_real) {
      const seguir = confirm(
        `El ${fechaVisible(dia.fecha)} ya tiene producción registrada.\n\nSi lo destildás, el plan de ese día queda en cero (las horas y kg planificados). Lo producido registrado no se borra.\n\n¿Continuar?`,
      );
      if (!seguir) return;
    }
    correr(() => alternarContempla(dia.fecha, nuevo, datos.operarios));
  }

  function onProducto(dia: DiaPlan, valor: string) {
    const categoria = valor === "—" ? "" : valor;
    const actual = dia.categorias.length === 1 ? dia.categorias[0] : "";
    if (dia.categorias.length <= 1 && actual === categoria) return;
    correr(() => asignarCategoria(dia.fecha, categoria, datos.operarios));
  }

  function onEliminar(dia: DiaPlan) {
    if (!dia.planificado) return;
    if (!confirm(`¿Quitar la planificación del ${fechaVisible(dia.fecha)}?`)) return;
    correr(() => eliminarDia(dia.fecha));
  }

  const logro =
    resumen.cumplimiento == null
      ? {
          valor: "—",
          pie:
            resumen.kg_plan > 0.0005
              ? `${datos.etiqueta} todavía no empezó`
              : "Sin producción planificada para comparar",
          color: "var(--color-text)",
        }
      : {
          valor: `${nro(resumen.cumplimiento, 1)}%`,
          pie: `${
            resumen.mes_en_curso && resumen.hasta
              ? `Plan al ${fechaVisible(resumen.hasta).slice(0, 5)}`
              : "Plan del mes"
          }: ${nro(resumen.kg_plan_vigente)} kg`,
          color: resumen.cumple ? "var(--color-primary)" : "var(--color-warning)",
        };

  const textoBoton = edicion
    ? "Finalizar edición"
    : completo
      ? "Editar plan del mes"
      : "Generar plan del mes";

  return (
    <div className="g-stack">
      {datos.error ? <p className="g-alert g-alert-danger">{datos.error}</p> : null}
      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {aviso ? <p className="g-alert g-alert-success">{aviso}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="g-page-title">Producción estimada</h1>
          <p className="g-page-subtitle">Plan mensual de capacidad y control de lo producido</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <button
              type="button"
              className="g-btn g-btn-secondary border-0"
              title="Mes anterior"
              onClick={() => {
                setEdicion(false);
                router.push(ruta(mesDesplazado(datos.mes, -1), datos.operarios));
              }}
            >
              ‹
            </button>
            <span className="min-w-36 text-center text-[13px] font-semibold">{datos.etiqueta}</span>
            <button
              type="button"
              className="g-btn g-btn-secondary border-0"
              title="Mes siguiente"
              onClick={() => {
                setEdicion(false);
                router.push(ruta(mesDesplazado(datos.mes, 1), datos.operarios));
              }}
            >
              ›
            </button>
          </div>
          <button
            type="button"
            className="g-btn g-btn-secondary"
            onClick={() => {
              setEdicion(false);
              router.push(ruta(hoyIso()));
            }}
          >
            Hoy
          </button>
          <button type="button" className="g-btn g-btn-icon h-9 w-9" title="Exportar Excel" aria-label="Exportar Excel" onClick={() => setExportar(true)}>
            <IconDownload className="h-4 w-4" />
          </button>
          <button type="button" className="g-btn g-btn-icon h-9 w-9" title="Exportar PDF" aria-label="Exportar PDF" onClick={() => setExportar(true)}>
            <IconFile className="h-4 w-4" />
          </button>
          {puedeEditar ? (
            <button type="button" className="g-btn g-btn-primary" disabled={pending} onClick={accionPlan}>
              {textoBoton}
            </button>
          ) : null}
        </div>
      </div>

      {exportar ? (
        <DialogoInforme
          titulo={`Planificación ${datos.etiqueta}`}
          nombreInicial={`Planificacion ${datos.etiqueta}`}
          hoja="Planificacion"
          encabezados={["Hs", "Día", "Fecha", "Disponibles", "Paradas", "Productivas", "Producto", "Pallets plan.", "Kg plan.", "Pallets real", "Kg real", "Desvío", "Observaciones"]}
          filas={filasPlan(datos)}
          onCerrar={() => setExportar(false)}
        />
      ) : null}
      {panelHoras ? <PanelHoras tipo={panelHoras} datos={datos} onCerrar={() => setPanelHoras(null)} /> : null}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Kpi
          titulo="Horas productivas"
          valor={`${nro(resumen.horas_productivas, 2)} hs`}
          pie={`Disp. ${nro(resumen.horas_disponibles, 2)} · Prog. ${nro(resumen.horas_paradas, 2)} · No prog. ${nro(resumen.horas_paradas_no, 2)}`}
          acciones={
            <>
              <button type="button" className="g-btn g-btn-icon h-7 w-7" title="Resumen horas" aria-label="Resumen horas" onClick={() => setPanelHoras("resumen")}>
                <IconList className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="g-btn g-btn-icon h-7 w-7" title="Análisis de horas" aria-label="Análisis de horas" onClick={() => setPanelHoras("analisis")}>
                <IconChart className="h-3.5 w-3.5" />
              </button>
            </>
          }
        />
        <Kpi
          titulo="Plan del mes"
          valor={`${nro(resumen.kg_plan)} kg`}
          pie={`${nro(resumen.pallets_plan, 2)} pallets · ${resumen.dias_planificados} de ${datos.dias.length} días`}
          tono="info"
        />
        <Kpi
          titulo="Producido"
          valor={`${nro(resumen.kg_reales)} kg`}
          pie={`${nro(resumen.pallets_reales, 2)} pallets registrados en producción`}
        />
        <Kpi titulo="Cumplimiento" valor={logro.valor} pie={logro.pie} color={logro.color} />
      </div>

      <div className="g-card flex flex-wrap items-end justify-between gap-3 p-3">
        <label>
          <span className="g-label">Disponibilidad operativa</span>
          <span className="flex items-center gap-2">
            <select
              className="g-input w-auto"
              value={String(datos.operarios)}
              disabled={!puedeEditar || pending}
              onChange={(e) => cambiarOperarios(e.target.value)}
            >
              {datos.config.operariosOpciones.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-[var(--color-text-muted)]">operarios</span>
          </span>
        </label>
        {puedeEditar ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setPanel("rendimientos")}>
              Producción / hora
            </button>
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setPanel("capacidades")}>
              Capacidad de línea
            </button>
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setPanel("horarios")}>
              Horarios
            </button>
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setPanel("paradas")}>
              Paradas
            </button>
          </div>
        ) : null}
        <p
          className="text-[12px]"
          style={{ color: faltantes > 0 ? "var(--color-warning)" : "var(--color-primary)" }}
        >
          {faltantes > 0 ? `${faltantes} día(s) del mes sin planificar` : "Mes completo planificado"}
        </p>
      </div>

      {panel ? (
        <PanelesPlan
          tipo={panel}
          config={datos.config}
          operarios={datos.operarios}
          mes={datos.mes}
          onCerrar={() => setPanel(null)}
          onListo={(mensaje) => {
            setPanel(null);
            setAviso(mensaje);
            router.refresh();
          }}
        />
      ) : null}

      {formDia ? (
        <FormularioDia
          key={formDia.fecha}
          dia={formDia}
          datos={datos}
          pending={pending}
          onCancelar={() => setFormFecha(null)}
          onGuardar={(payload) =>
            correr(async () => {
              const resultado = await guardarDia(payload);
              setFormFecha(null);
              return resultado;
            })
          }
        />
      ) : null}

      <div className="g-table-wrap">
        <div className="g-table-scroll">
          <table className="g-table">
            <thead>
              <tr>
                <th>Hs</th>
                <th>Día</th>
                <th>Fecha</th>
                <th>Disponibles</th>
                <th>Paradas</th>
                <th>Productivas</th>
                <th>Producto</th>
                <th>Pallets plan.</th>
                <th>Kg plan.</th>
                <th>Pallets real</th>
                <th>Kg real</th>
                <th>Desvío</th>
                <th>Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.dias.map((dia) => (
                <tr key={dia.fecha} style={{ color: dia.contempla ? undefined : "var(--color-text-muted)" }}>
                  <td>
                    {edicion && dia.planificado && puedeEditar ? (
                      <input
                        type="checkbox"
                        checked={dia.contempla}
                        disabled={pending}
                        onChange={() => onContempla(dia)}
                        aria-label="Día laboral"
                      />
                    ) : (
                      <span style={{ color: dia.contempla ? "var(--color-primary)" : undefined }}>
                        {dia.contempla ? "✓" : "—"}
                      </span>
                    )}
                  </td>
                  <td>{dia.dia_semana}</td>
                  <td className="font-medium">{fechaVisible(dia.fecha)}</td>
                  <td className="tabular-nums">{nro(dia.horas_disponibles, 2)}</td>
                  <td className="tabular-nums">{nro(dia.horas_paradas, 2)}</td>
                  <td className="tabular-nums">{nro(dia.horas_productivas, 2)}</td>
                  <td>
                    {edicion && dia.planificado && dia.contempla && puedeEditar ? (
                      <select
                        className="g-input"
                        value={dia.categorias[0] || "—"}
                        disabled={pending}
                        onChange={(e) => onProducto(dia, e.target.value)}
                      >
                        <option>—</option>
                        {datos.config.categorias.map((cat) => (
                          <option key={cat}>{cat}</option>
                        ))}
                        {dia.categorias[0] && !datos.config.categorias.includes(dia.categorias[0]) ? (
                          <option>{dia.categorias[0]}</option>
                        ) : null}
                      </select>
                    ) : (
                      dia.etiqueta_categorias || "—"
                    )}
                  </td>
                  <td className="tabular-nums" style={{ color: dia.kg_plan ? "var(--color-info)" : undefined }}>
                    {dia.pallets_plan ? nro(dia.pallets_plan, 2) : "—"}
                  </td>
                  <td className="tabular-nums" style={{ color: dia.kg_plan ? "var(--color-info)" : undefined }}>
                    {dia.kg_plan ? nro(dia.kg_plan) : "—"}
                  </td>
                  <td className="tabular-nums">{dia.pallets_reales ? nro(dia.pallets_reales, 2) : "—"}</td>
                  <td className="tabular-nums">{dia.kg_reales ? nro(dia.kg_reales) : "—"}</td>
                  <td className="tabular-nums">{textoDesvio(dia.desvio_pct)}</td>
                  <td title={dia.observaciones}>{dia.observaciones || "—"}</td>
                  <td className="whitespace-nowrap">
                    {puedeEditar ? (
                      <div className="flex items-center gap-1.5">
                        {edicion ? null : <RowEditButton onClick={() => setFormFecha(dia.fecha)} />}
                        {dia.planificado ? (
                          <RowDeleteButton disabled={pending} onClick={() => onEliminar(dia)} />
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold" style={{ background: "var(--color-primary-soft)" }}>
                <td />
                <td>TOTAL</td>
                <td />
                <td className="tabular-nums">{nro(resumen.horas_disponibles, 2)}</td>
                <td className="tabular-nums">{nro(resumen.horas_paradas, 2)}</td>
                <td className="tabular-nums">{nro(resumen.horas_productivas, 2)}</td>
                <td />
                <td className="tabular-nums">{nro(resumen.pallets_plan, 2)}</td>
                <td className="tabular-nums">{nro(resumen.kg_plan)}</td>
                <td className="tabular-nums">{nro(resumen.pallets_reales, 2)}</td>
                <td className="tabular-nums">{nro(resumen.kg_reales)}</td>
                <td className="tabular-nums">{textoDesvio(resumen.desvio_pct)}</td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function FormularioDia({
  dia,
  datos,
  pending,
  onCancelar,
  onGuardar,
}: {
  dia: DiaPlan;
  datos: DatosPlan;
  pending: boolean;
  onCancelar: () => void;
  onGuardar: (payload: {
    fecha: string;
    operarios: number;
    contempla: boolean;
    horas_disponibles: number;
    horas_paradas: number;
    observaciones: string;
    asignaciones: AsignacionDia[];
  }) => void;
}) {
  const inicial = useMemo(() => estadoInicial(dia, datos), [dia, datos]);
  const [contempla, setContempla] = useState(inicial.contempla);
  const [operarios, setOperarios] = useState(inicial.operarios);
  const [disponibles, setDisponibles] = useState(inicial.disponibles);
  const [paradas, setParadas] = useState(inicial.paradas);
  const [observaciones, setObservaciones] = useState(dia.observaciones);
  const [marcas, setMarcas] = useState<Record<string, { on: boolean; horas: string }>>(inicial.marcas);
  const [error, setError] = useState<string | null>(null);

  const productivas = contempla
    ? Math.round(Math.max(0, (Number(disponibles.replace(",", ".")) || 0) - Math.min(Number(paradas.replace(",", ".")) || 0, Number(disponibles.replace(",", ".")) || 0)) * 100) / 100
    : 0;
  const detalle = paradasDe(datos.config, dia.dia_semana, operarios);
  const partes = Object.entries(detalle).filter(([, horas]) => horas > 0.0005);

  function redistribuir(siguiente: Record<string, { on: boolean; horas: string }>, total: number) {
    const activas = datos.config.categorias.filter((cat) => siguiente[cat]?.on);
    if (!activas.length) return siguiente;
    const base = Math.round((total / activas.length) * 100) / 100;
    const copia = { ...siguiente };
    activas.forEach((cat, indice) => {
      const horas = indice < activas.length - 1 ? base : Math.round((total - base * (activas.length - 1)) * 100) / 100;
      copia[cat] = { on: true, horas: String(Math.max(0, horas)) };
    });
    return copia;
  }

  function reponer() {
    const disp = String(contempla ? horasDisponibles(datos.config, dia.dia_semana) : 0);
    const par = contempla ? String(horasParadas(datos.config, dia.dia_semana, operarios)) : "0";
    setDisponibles(disp);
    setParadas(par);
    const total = contempla
      ? Math.round(Math.max(0, Number(disp) - Math.min(Number(par), Number(disp))) * 100) / 100
      : 0;
    setMarcas((actual) => redistribuir(actual, total));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const asignaciones = datos.config.categorias
      .filter((cat) => marcas[cat]?.on)
      .map((cat) => ({ categoria: cat, horas: Number(String(marcas[cat].horas).replace(",", ".")) || 0 }));
    onGuardar({
      fecha: dia.fecha,
      operarios,
      contempla,
      horas_disponibles: Number(disponibles.replace(",", ".")) || 0,
      horas_paradas: Number(paradas.replace(",", ".")) || 0,
      observaciones,
      asignaciones,
    });
    setError(null);
  }

  return (
    <form className="g-card space-y-3 p-3" onSubmit={onSubmit}>
      <p className="g-section-title">
        {dia.dia_semana} {fechaVisible(dia.fecha)}
      </p>
      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={contempla}
          onChange={(e) => {
            const on = e.target.checked;
            setContempla(on);
            if (!on) {
              setMarcas((actual) => {
                const copia = { ...actual };
                for (const cat of datos.config.categorias) copia[cat] = { on: false, horas: "" };
                return copia;
              });
            }
          }}
        />
        Contemplar horas de este día
      </label>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <label>
          <span className="g-label">Operarios</span>
          <select
            className="g-input"
            value={operarios}
            onChange={(e) => setOperarios(Number(e.target.value))}
          >
            {datos.config.operariosOpciones.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="g-label">Horas disponibles</span>
          <input className="g-input" value={disponibles} disabled={!contempla} onChange={(e) => setDisponibles(e.target.value)} />
        </label>
        <label>
          <span className="g-label">Horas paradas</span>
          <input className="g-input" value={paradas} disabled={!contempla} onChange={(e) => setParadas(e.target.value)} />
        </label>
        <label>
          <span className="g-label">Horas productivas</span>
          <input className="g-input" readOnly value={`${nro(productivas, 2)} hs`} />
        </label>
        <label className="col-span-2">
          <span className="g-label">Observaciones</span>
          <input
            className="g-input"
            placeholder="Feriado, mantenimiento, aclaraciones..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </label>
      </div>
      <p className="text-[12px] text-[var(--color-text-muted)]">
        {partes.length ? partes.map(([causa, horas]) => `${causa}: ${nro(horas, 2)}`).join(" · ") : "Sin paradas programadas."}
      </p>
      <p className="text-[13px] font-semibold">Producción planificada</p>
      {datos.config.categorias.length === 0 ? (
        <p className="text-[12px] text-[var(--color-text-muted)]">Cargá las categorías en el panel de capacidad de línea.</p>
      ) : (
        <div className="space-y-2">
          {datos.config.categorias.map((cat) => {
            const marca = marcas[cat] ?? { on: false, horas: "" };
            const [pall, kg] = marca.on ? estimar(datos.config, cat, operarios, Number(String(marca.horas).replace(",", ".")) || 0) : [0, 0];
            return (
              <div key={cat} className="grid grid-cols-[1fr_90px_160px] items-center gap-2">
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={marca.on}
                    disabled={!contempla}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setMarcas((actual) => {
                        const copia = { ...actual, [cat]: { on, horas: actual[cat]?.horas ?? "" } };
                        return redistribuir(copia, productivas);
                      });
                    }}
                  />
                  {cat}
                </label>
                <input
                  className="g-input"
                  disabled={!contempla || !marca.on}
                  value={marca.horas}
                  onChange={(e) => setMarcas((actual) => ({ ...actual, [cat]: { on: true, horas: e.target.value } }))}
                />
                <span className="text-[12px] text-[var(--color-text-muted)]">
                  {marca.on ? `${nro(pall, 2)} pall. · ${nro(kg)} kg` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="g-btn g-btn-secondary" onClick={reponer}>
          Valores de configuración
        </button>
        <button type="button" className="g-btn g-btn-secondary" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="g-btn g-btn-primary" disabled={pending}>
          Guardar
        </button>
      </div>
    </form>
  );
}

function estadoInicial(dia: DiaPlan, datos: DatosPlan) {
  const planificado = dia.planificado;
  let contempla = dia.contempla || !planificado;
  let disponibles = dia.horas_disponibles;
  let paradas = dia.horas_paradas;
  if (!planificado) {
    disponibles = horasDisponibles(datos.config, dia.dia_semana);
    paradas = disponibles > 0 ? horasParadas(datos.config, dia.dia_semana, dia.operarios || datos.operarios) : 0;
    if (disponibles <= 0) contempla = false;
  }
  const marcas: Record<string, { on: boolean; horas: string }> = {};
  for (const cat of datos.config.categorias) {
    const linea = dia.lineas.find((l) => l.categoria === cat && l.id != null);
    marcas[cat] = linea ? { on: true, horas: String(linea.horas_productivas) } : { on: false, horas: "" };
  }
  const ops = datos.config.operariosOpciones.includes(dia.operarios) ? dia.operarios : datos.operarios;
  return { contempla, disponibles: String(disponibles), paradas: String(paradas), operarios: ops, marcas };
}

function Kpi({
  titulo,
  valor,
  pie,
  tono,
  color,
  acciones,
}: {
  titulo: string;
  valor: string;
  pie: string;
  tono?: "info";
  color?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="g-kpi">
      <div className="flex items-center justify-between gap-1">
        <p className="g-kpi-title">{titulo}</p>
        {acciones ? <div className="flex gap-1">{acciones}</div> : null}
      </div>
      <p
        className="g-kpi-value"
        style={{ color: color ?? (tono === "info" ? "var(--color-info)" : "var(--color-primary)") }}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{pie}</p>
    </div>
  );
}
