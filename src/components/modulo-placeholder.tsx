import { AppShell } from "@/components/app-shell";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { ModuloId, MODULOS } from "@/lib/modulos";
import { redirect } from "next/navigation";

export async function PlaceholderModulo({
  moduloId,
}: {
  moduloId: ModuloId;
}) {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, moduloId, "ver")) {
    redirect("/");
  }
  const meta = MODULOS.find((m) => m.id === moduloId);

  return (
    <AppShell perfil={perfil} activo={moduloId}>
      <h1 className="text-xl font-semibold">{meta?.label ?? moduloId}</h1>
      <p className="mt-2 text-sm text-[var(--muted-fg)]">
        Módulo en construcción. Los permisos de tu rol ya controlan el acceso a
        esta pantalla.
      </p>
    </AppShell>
  );
}
