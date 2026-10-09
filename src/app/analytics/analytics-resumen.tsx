"use client";

import { IconClose, IconDownload, IconFile } from "@/components/ui/icons";
import { fmtKg } from "@/lib/analytics/logic";
import { descargarResumenMesExcel, descargarResumenMesPdf } from "@/lib/analytics/resumen-exportar";
import { fmtHs, textoCantidad, textoStock, type ResumenMesVista } from "@/lib/analytics/resumen-operativo";
import { fechaVisible } from "@/lib/solicitudes/logic";

function Horas({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-[var(--color-border)] px-3 py-1.5 text-[13px]">
      <span>{etiqueta}</span>
      <span className="font-semibold tabular-nums">{valor}</span>
    </div>
  );
}

export function PanelResumenMes({ resumen, onCerrar }: { resumen: ResumenMesVista; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="g-card my-4 w-full max-w-3xl space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-[var(--color-text-muted)]">
              {fechaVisible(resumen.desde)} – {fechaVisible(resumen.hasta)}
            </p>
            <h2 className="text-[16px] font-bold tracking-wide">RESUMEN PRODUCCIÓN + HS + INGREDIENTES</h2>
            <p className="text-[12px] text-[var(--color-text-muted)]">{resumen.etiqueta}</p>
          </div>
          <div className="flex gap-1">
            <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Descargar PDF" aria-label="Descargar PDF" onClick={() => descargarResumenMesPdf(resumen)}>
              <IconDownload className="h-4 w-4" />
            </button>
            <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Descargar Excel" aria-label="Descargar Excel" onClick={() => descargarResumenMesExcel(resumen)}>
              <IconFile className="h-4 w-4" />
            </button>
            <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Cerrar" aria-label="Cerrar" onClick={onCerrar}>
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Horas etiqueta={`Total horas disponibles ${resumen.etiqueta}`} valor={fmtHs(resumen.disponibles)} />
          <Horas etiqueta={`Total horas finalizadas ${resumen.etiqueta}`} valor={fmtHs(resumen.finalizadas)} />
          <Horas etiqueta={`Total horas productivas ${resumen.etiqueta}`} valor={fmtHs(resumen.productivas)} />
          <Horas etiqueta={`Total horas paradas ${resumen.etiqueta}`} valor={fmtHs(resumen.paradas)} />
          <Horas etiqueta={`Total horas pendientes ${resumen.etiqueta}`} valor={fmtHs(resumen.pendientes)} />
          <Horas etiqueta={`Total horas pendientes planificadas ${resumen.etiqueta}`} valor={fmtHs(resumen.planificadas)} />
          <Horas etiqueta={`Total horas pendientes sin planificar ${resumen.etiqueta}`} valor={fmtHs(resumen.sinPlanificar)} />
          <p className="pt-1 text-[11px] text-[var(--color-text-muted)]">{resumen.notaHoras}</p>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-bold tracking-wide">PRODUCCIÓN POR TIPO DE ENVASE</p>
          {resumen.envases.length === 0 ? (
            <p className="text-[13px] text-[var(--color-text-muted)]">Sin producción elaborada ni pendiente en este mes.</p>
          ) : (
            <div className="g-table-scroll">
              <table className="g-table">
                <thead>
                  <tr>
                    <th>Envase</th>
                    <th>Elaborado</th>
                    <th>Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.envases.map((fila) => (
                    <tr key={fila.envase}>
                      <td>{fila.envase}</td>
                      <td className="tabular-nums whitespace-nowrap">{fmtKg(fila.elaborado)}</td>
                      <td className="tabular-nums whitespace-nowrap">{fmtKg(fila.pendiente)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-[13px] font-bold tracking-wide">RESUMEN DEL ESTADO DE LOS CONSUMOS</p>
          {resumen.consumos.every((grupo) => grupo.filas.length === 0) ? (
            <p className="text-[13px] text-[var(--color-text-muted)]">No hay consumo pendiente en las solicitudes abiertas.</p>
          ) : (
            resumen.consumos.map((grupo) =>
              grupo.filas.length === 0 ? null : (
                <div key={grupo.titulo}>
                  <p className="mb-1 text-[12px] font-semibold">{grupo.titulo}</p>
                  <div className="g-table-scroll">
                    <table className="g-table">
                      <thead>
                        <tr>
                          <th>Artículo</th>
                          <th>Pendiente</th>
                          <th>Stock</th>
                          <th>Faltante</th>
                          <th>Sobrante</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.filas.map((fila) => (
                          <tr key={`${grupo.titulo}-${fila.nombre}`}>
                            <td>{fila.nombre}</td>
                            <td className="tabular-nums whitespace-nowrap">{textoCantidad(fila)}</td>
                            <td className="tabular-nums whitespace-nowrap">{textoStock(fila, "stock")}</td>
                            <td className="tabular-nums whitespace-nowrap">{textoStock(fila, "faltante")}</td>
                            <td className="tabular-nums whitespace-nowrap">{textoStock(fila, "sobrante")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}
