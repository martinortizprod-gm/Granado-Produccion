import { AppShell } from "@/components/app-shell";
import { CatalogoClient } from "@/app/catalogo/catalogo-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarCatalogo } from "@/lib/catalogos/data";
import { CATALOGOS, KindCatalogo } from "@/lib/catalogos/logic";
import { redirect } from "next/navigation";

export async function PaginaCatalogo({ kind }: { kind: KindCatalogo }) {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, kind, "ver")) redirect("/");

  const cfg = CATALOGOS[kind];
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

  const { articulos, error } = await cargarCatalogo(kind);

  return (
    <AppShell perfil={perfil} activo={kind}>
      <CatalogoClient
        kind={kind}
        articulos={articulos}
        errorCarga={error}
        puedeEditar={puede(perfil, kind, "editar")}
        puedeAjustar={puede(perfil, "movimientos", "editar")}
      />
    </AppShell>
  );
}
