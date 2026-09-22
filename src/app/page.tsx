import { AppShell } from "@/components/app-shell";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import {
  createClient,
  supabaseEnvConfigured,
} from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const perfil = await getPerfilSesion();
  if (!perfil) redirect("/login");
  if (!puede(perfil, "inicio", "ver")) redirect("/login");

  const envOk = supabaseEnvConfigured();
  let productosCount: number | null = null;
  let errorMsg: string | null = null;

  if (envOk && puede(perfil, "productos", "leer")) {
    try {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from("catalogo_productos")
        .select("*", { count: "exact", head: true });
      if (error) errorMsg = error.message;
      else productosCount = count ?? 0;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Error al conectar";
    }
  }

  return (
    <AppShell perfil={perfil} activo="inicio">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Inicio</h1>
        <p className="mt-1 text-sm text-[var(--muted-fg)]">
          Bienvenido
          {perfil.nombre ? `, ${perfil.nombre}` : ""}. Rol:{" "}
          <strong>{perfil.rolNombre ?? "sin asignar"}</strong>
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            Variables de entorno:{" "}
            <strong className="text-[var(--granado)]">
              {envOk ? "OK" : "Faltan"}
            </strong>
          </li>
          {puede(perfil, "productos", "leer") ? (
            <li>
              Productos:{" "}
              {errorMsg ? (
                <strong className="text-[var(--danger)]">{errorMsg}</strong>
              ) : (
                <strong className="text-[var(--granado)]">
                  {productosCount ?? "—"} registro(s)
                </strong>
              )}
            </li>
          ) : null}
        </ul>
        {puede(perfil, "productos", "ver") ? (
          <Link
            href="/productos"
            className="mt-4 inline-block rounded-md bg-[var(--granado)] px-4 py-2 text-sm font-medium text-white"
          >
            Ir a productos
          </Link>
        ) : null}
        {!perfil.idRol && !perfil.esAdministrador ? (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
            Tu usuario de Auth aún no tiene rol en la tabla usuarios. Un
            administrador debe asignártelo en Usuarios, o ejecutá el SQL de
            roles y vinculá el mail.
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
