import { AppShell } from "@/components/app-shell";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
      <h1 className="mb-4 text-xl font-semibold">Productos</h1>
      {!puede(perfil, "productos", "leer") ? (
        <p className="text-sm text-[var(--muted-fg)]">
          No tenés permiso de lectura en este módulo.
        </p>
      ) : error ? (
        <p className="rounded-md border border-red-300 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : productos.length === 0 ? (
        <p className="text-sm text-[var(--muted-fg)]">Sin productos.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--granado)] text-white">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Medida</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2">{p.id}</td>
                  <td className="px-4 py-2">{p.codigo ?? "—"}</td>
                  <td className="px-4 py-2">{p.producto ?? "—"}</td>
                  <td className="px-4 py-2">{p.categoria ?? "—"}</td>
                  <td className="px-4 py-2">{p.medida ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
