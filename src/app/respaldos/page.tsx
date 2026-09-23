import { AppShell } from "@/components/app-shell";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { listarEsquema } from "@/lib/respaldos/esquema";
import { redirect } from "next/navigation";
import { RespaldosClient } from "@/app/respaldos/respaldos-client";

export const dynamic = "force-dynamic";

export default async function RespaldosPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "respaldos", "ver")) {
    redirect("/");
  }

  let errorMsg: string | null = null;
  let tablas: Awaited<ReturnType<typeof listarEsquema>> = [];

  if (!puede(perfil, "respaldos", "leer")) {
    errorMsg = "No tenés permiso de lectura para exportar respaldos.";
  } else {
    try {
      tablas = await listarEsquema();
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "No se pudo leer la base de datos.";
    }
  }

  return (
    <AppShell perfil={perfil} activo="respaldos">
      <div className="g-stack">
        <div>
          <h1 className="g-page-title">Respaldos</h1>
          <p className="g-page-subtitle">
            Elegí tablas y columnas de la base. Las columnas vienen marcadas y podés
            desmarcar las que no quieras exportar.
          </p>
        </div>
        {errorMsg ? (
          <p className="g-alert g-alert-danger">{errorMsg}</p>
        ) : (
          <RespaldosClient tablas={tablas} />
        )}
      </div>
    </AppShell>
  );
}
