import {
  IconBolt,
  IconCalendar,
  IconChevron,
  IconClipboard,
  IconFactory,
  IconPlus,
  IconSwap,
  IconWeight,
} from "@/components/ui/icons";
import type { AccionInicio, DashboardInicio, MedidorInicio } from "@/lib/inicio/dashboard";
import { colorEstado } from "@/lib/solicitudes/logic";
import Link from "next/link";
import type { ReactNode } from "react";

const ICONOS_MEDIDOR: Record<MedidorInicio["id"], ReactNode> = {
  pendientes: <IconClipboard className="h-5 w-5" />,
  curso: <IconFactory className="h-5 w-5" />,
  kg: <IconWeight className="h-5 w-5" />,
  programadas: <IconCalendar className="h-5 w-5" />,
};

const ICONOS_ACCION: Record<AccionInicio["id"], ReactNode> = {
  solicitud: <IconPlus className="h-5 w-5" />,
  movimiento: <IconSwap className="h-5 w-5" />,
  produccion: <IconFactory className="h-5 w-5" />,
  plan: <IconCalendar className="h-5 w-5" />,
};

export function InicioDashboard({
  datos,
  mostrarAvisoRol,
}: {
  datos: DashboardInicio;
  mostrarAvisoRol: boolean;
}) {
  return (
    <div className="g-dash">
      <section className="g-dash-card g-dash-welcome relative overflow-hidden px-4 py-4 sm:px-5">
        <div className="relative min-w-0">
          <h1 className="text-[1.35rem] font-bold tracking-tight text-[var(--color-text)] sm:text-[1.6rem]">
            {datos.saludo}, {datos.nombre}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)] sm:text-sm">
            Resumen de producción · {datos.fecha}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[var(--color-text-secondary)]">
            <p className="inline-flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background:
                    datos.sistemaTono === "ok"
                      ? "var(--color-success)"
                      : datos.sistemaTono === "danger"
                        ? "var(--color-danger)"
                        : "var(--color-warning)",
                }}
                aria-hidden
              />
              <span>{datos.sistemaTexto}</span>
            </p>
            <p>Última actualización: {datos.actualizado}</p>
          </div>
        </div>
      </section>

      {datos.errores.length > 0 ? (
        <p className="g-alert g-alert-warning">{datos.errores.join(" ")}</p>
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {datos.medidores.map((item) => (
          <article key={item.id} className="g-dash-card flex h-full min-w-0 flex-col px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                {ICONOS_MEDIDOR[item.id]}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">
                  {item.titulo}
                </p>
                <p className="g-kpi-value">
                  {item.valor}
                  {item.unidad ? (
                    <span className="ml-1 text-[0.95rem] font-semibold text-[var(--color-text-muted)]">
                      {item.unidad}
                    </span>
                  ) : null}
                </p>
                {item.detalle ? (
                  <p className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">{item.detalle}</p>
                ) : null}
              </div>
            </div>
            {item.href && item.accion ? (
              <Link
                href={item.href}
                className="mt-auto inline-flex items-center gap-1 pt-3 text-[12.5px] font-semibold text-[var(--color-primary)]"
              >
                {item.accion}
                <IconChevron className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </article>
        ))}
      </section>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,22rem)]">
        <section className="g-dash-card min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <h2 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                <IconFactory className="h-4 w-4" />
              </span>
              Actividad de hoy
            </h2>
            {datos.actividad.href ? (
              <Link
                href={datos.actividad.href}
                className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[var(--color-primary)]"
              >
                Ver todas
                <IconChevron className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
          {datos.actividad.filas.length === 0 ? (
            <p className="px-4 pb-4 text-[13px] text-[var(--color-text-muted)]">
              {datos.actividad.vacio}
            </p>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <table className="g-table g-dash-table min-w-[36rem]">
                <thead>
                  <tr>
                    <th scope="col">Nº / Producto</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Inicio</th>
                    <th scope="col">Fin est.</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.actividad.filas.map((fila) => (
                    <tr key={fila.clave}>
                      <td className="max-w-[16rem]">
                        <div className="min-w-0">
                          {fila.href ? (
                            <Link
                              href={fila.href}
                              className="font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
                              title={fila.lote}
                            >
                              {fila.lote}
                            </Link>
                          ) : (
                            <p className="font-semibold" title={fila.lote}>
                              {fila.lote}
                            </p>
                          )}
                          <p className="g-truncate text-[12px] text-[var(--color-text-muted)]" title={fila.producto}>
                            {fila.producto}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className={colorEstado(fila.estado)}>{fila.estadoEtiqueta}</span>
                      </td>
                      <td className="whitespace-nowrap tabular-nums" title="Fecha de registro">
                        {fila.inicio}
                      </td>
                      <td className="whitespace-nowrap tabular-nums" title="Fecha estimada de finalización">
                        {fila.fin}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid min-w-0 gap-3">
          <section className="g-dash-alert px-4 py-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold">Atención</h2>
              <span className="text-[13px] text-[var(--color-warning)]" aria-hidden>
                ●
              </span>
            </div>
            {datos.alertas.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                No hay alertas para mostrar.
              </p>
            ) : (
              <ul className="grid gap-1">
                {datos.alertas.map((alerta) => (
                  <li key={alerta.texto}>
                    <Link
                      href={alerta.href}
                      className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-[13px] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                    >
                      <span
                        className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold"
                        style={{
                          background: "color-mix(in srgb, var(--color-warning) 18%, var(--color-surface))",
                          color: "var(--color-warning)",
                        }}
                      >
                        {alerta.cantidad}
                      </span>
                      <span className="min-w-0 flex-1">{alerta.texto}</span>
                      <IconChevron className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {datos.acciones.length > 0 ? (
            <section className="g-dash-card px-4 py-3.5">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                <IconBolt className="h-4 w-4 text-[var(--color-primary)]" />
                Acciones rápidas
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                {datos.acciones.map((accion) => (
                  <Link
                    key={accion.id}
                    href={accion.href}
                    className="flex min-w-0 flex-col items-center gap-2 rounded-xl px-2 py-3 text-center hover:bg-[var(--color-primary-soft)]"
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full text-white"
                      style={{ background: "var(--color-primary)" }}
                    >
                      {ICONOS_ACCION[accion.id]}
                    </span>
                    <span className="text-[12.5px] font-semibold leading-snug">{accion.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {mostrarAvisoRol ? (
        <p className="g-alert g-alert-warning">
          Tu usuario de Auth aún no tiene rol en la tabla usuarios. Un administrador debe
          asignártelo en Usuarios, o ejecutá el SQL de roles y vinculá el mail.
        </p>
      ) : null}
    </div>
  );
}
