import { AppShell } from "@/components/app-shell";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProductosTabla } from "@/app/productos/productos-tabla";

export const dynamic = "force-dynamic";

type Producto = {
  id: number;
  codigo: string | null;
  producto: string | null;
  categoria: string | null;
  medida: string | null;
};

export default async function ProductosPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "productos", "ver")) {
    redirect("/");
  }

  let productos: Producto[] = [];
  let error: string | null = null;

  if (puede(perfil, "productos", "leer")) {
    const supabase = await createClient();
    const res = await supabase
      .from("catalogo_productos")
      .select("id, codigo, producto, categoria, medida")
      .order("id", { ascending: true });
    if (res.error) error = res.error.message;
    else productos = (res.data ?? []) as Producto[];
  }

  return (
    <AppShell perfil={perfil} activo="productos">
      <div className="g-stack">
        <div>
          <h1 className="g-page-title">Productos</h1>
          <p className="g-page-subtitle">
            Catálogo de productos del sistema.
          </p>
        </div>

        {!puede(perfil, "productos", "leer") ? (
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        ) : error ? (
          <p className="g-alert g-alert-danger">{error}</p>
        ) : productos.length === 0 ? (
          <div className="g-card p-4 text-[13px] text-[var(--color-text-muted)]">
            Sin productos.
          </div>
        ) : (
          <ProductosTabla productos={productos} />
        )}
      </div>
    </AppShell>
  );
}
