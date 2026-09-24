import { AppShell } from "@/components/app-shell";
import { TercerosClient } from "@/app/terceros/terceros-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarPartes } from "@/lib/terceros/data";
import { KindParte, PARTES } from "@/lib/terceros/logic";
import { redirect } from "next/navigation";

export async function PaginaTerceros({ kind }: { kind: KindParte }) {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, kind, "ver")) redirect("/");

  const cfg = PARTES[kind];
  if (!puede(perfil, kind, "leer")) {
    return (
      <AppShell perfil={perfil} activo={kind}>
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">{cfg.titulo}</h1>
            <p className="g-page-subtitle">{cfg.subtitulo}</p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      </AppShell>
    );
  }

  const { items, error } = await cargarPartes(kind);

  return (
    <AppShell perfil={perfil} activo={kind}>
      <TercerosClient
        kind={kind}
        items={items}
        errorCarga={error}
        puedeEditar={puede(perfil, kind, "editar")}
      />
    </AppShell>
  );
}
