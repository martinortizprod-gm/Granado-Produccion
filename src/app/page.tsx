import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/ui/brand";
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
  const nombre = perfil.nombre || "usuario";
  const puedeProductos = puede(perfil, "productos", "leer");
  const puedeVerProductos = puede(perfil, "productos", "ver");

  if (envOk && puedeProductos) {
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
      <div className="g-stack max-w-3xl">
        <div className="g-card relative overflow-hidden px-4 py-3.5">
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              background:
                "linear-gradient(120deg, var(--color-primary-light) 0%, transparent 55%)",
            }}
          />
          <div className="relative flex items-center gap-3">
            <BrandMark size={40} className="shrink-0 shadow-sm" />
            <div className="min-w-0">
              <h1 className="g-page-title">¡Hola, {nombre}!</h1>
              <p className="g-page-subtitle">
                Bienvenido al sistema de producción Granado.
              </p>
              <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
                Rol: <strong>{perfil.rolNombre ?? "sin asignar"}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="g-kpi">
            <p className="g-kpi-title">Entorno</p>
            <p
              className="g-kpi-value"
              style={{
                color: envOk
                  ? "var(--color-success)"
                  : "var(--color-danger)",
                fontSize: "1.15rem",
              }}
            >
              {envOk ? "Conectado" : "Sin config"}
            </p>
          </div>

          {puedeProductos ? (
            <div className="g-kpi flex flex-col">
              <p className="g-kpi-title">Productos</p>
              {errorMsg ? (
                <p
                  className="mt-1 text-[13px]"
                  style={{ color: "var(--color-danger)" }}
                >
                  {errorMsg}
                </p>
              ) : (
                <p
                  className="g-kpi-value"
                  style={{ color: "var(--color-primary)" }}
                >
                  {productosCount ?? "—"}
                </p>
              )}
              {puedeVerProductos && !errorMsg ? (
                <Link
                  href="/productos"
                  className="g-btn g-btn-primary g-btn-sm mt-2.5 w-fit"
                >
                  Ir a productos
                </Link>
              ) : null}
            </div>
          ) : puedeVerProductos ? (
            <div className="g-kpi flex flex-col justify-between">
              <p className="g-kpi-title">Productos</p>
              <Link href="/productos" className="g-btn g-btn-primary g-btn-sm mt-2 w-fit">
                Ir a productos
              </Link>
            </div>
          ) : null}
        </div>

        {!perfil.idRol && !perfil.esAdministrador ? (
          <p className="g-alert g-alert-warning">
            Tu usuario de Auth aún no tiene rol en la tabla usuarios. Un
            administrador debe asignártelo en Usuarios, o ejecutá el SQL de
            roles y vinculá el mail.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
