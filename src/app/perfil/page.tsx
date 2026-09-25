import { AppShell } from "@/components/app-shell";
import { PerfilClient } from "@/app/perfil/perfil-client";
import { getPerfilSesion } from "@/lib/auth/permisos";
import { cargarMiPerfil, datosDesdePerfil } from "@/lib/auth/mi-perfil";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const perfil = await getPerfilSesion();
  if (!perfil) redirect("/login");

  let datos = datosDesdePerfil(perfil);
  let errorCarga: string | null = null;
  try {
    datos = await cargarMiPerfil(perfil);
  } catch (e) {
    errorCarga =
      e instanceof Error ? e.message : "No se pudieron leer los datos del perfil";
  }

  return (
    <AppShell perfil={perfil}>
      <PerfilClient datos={datos} errorCarga={errorCarga} />
    </AppShell>
  );
}
