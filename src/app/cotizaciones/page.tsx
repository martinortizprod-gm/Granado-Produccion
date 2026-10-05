import { AppShell } from "@/components/app-shell";
import { CotizacionesClient } from "@/app/cotizaciones/cotizaciones-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarCotizaciones } from "@/lib/cotizaciones/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CotizacionesPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "cotizaciones", "ver")) redirect("/");

  if (!puede(perfil, "cotizaciones", "leer")) {
    return (
      <AppShell perfil={perfil} activo="cotizaciones">
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">Cotizaciones</h1>
            <p className="g-page-subtitle">
              Listas de costo interno por tonelada. No es la cotización del dólar.
            </p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      </AppShell>
    );
  }

  const datos = await cargarCotizaciones();

  return (
    <AppShell perfil={perfil} activo="cotizaciones">
      <CotizacionesClient
        ingredientes={datos.ingredientes}
        productos={datos.productos}
        paresFazon={datos.pares_fazon}
        versiones={datos.versiones}
        listasMp={datos.listas_mp}
        listasFazon={datos.listas_fazon}
        filasProducto={datos.filas_producto}
        cotizacionesProducto={datos.cotizaciones_producto}
        errorCarga={datos.error}
        puedeEditar={puede(perfil, "cotizaciones", "editar")}
      />
    </AppShell>
  );
}
