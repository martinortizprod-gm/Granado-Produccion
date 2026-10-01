import { ConsultasIaClient } from "@/app/consultas-ia/consultas-ia-client";
import { AppShell } from "@/components/app-shell";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { claveGemini } from "@/lib/consultas-ia/gemini";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConsultasIaPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "consultas-ia", "ver")) redirect("/");

  if (!puede(perfil, "consultas-ia", "leer")) {
    return (
      <AppShell perfil={perfil} activo="consultas-ia">
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">Consultas IA</h1>
            <p className="g-page-subtitle">
              Prueba con Gemini sobre stock, producción, planificación y solicitudes.
            </p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell perfil={perfil} activo="consultas-ia">
      <ConsultasIaClient tieneClave={Boolean(claveGemini())} />
    </AppShell>
  );
}
