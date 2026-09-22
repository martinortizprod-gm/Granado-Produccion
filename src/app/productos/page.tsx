import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Producto = {
  id: number;
  codigo: string | null;
  producto: string | null;
  categoria: string | null;
  medida: string | null;
};

export default async function ProductosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalogo_productos")
    .select("id, codigo, producto, categoria, medida")
    .order("id", { ascending: true });

  const productos = (data ?? []) as Producto[];

  return (
    <div className="min-h-full bg-[#f4f7f5]">
      <header className="border-b border-[#3D7A56]/15 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <Link
              href="/"
              className="text-xs font-medium tracking-wide text-[#3D7A56] uppercase hover:underline"
            >
              ← Inicio
            </Link>
            <h1 className="text-xl font-semibold text-[#1f3d2c]">Productos</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Error al leer: {error.message}
          </p>
        ) : productos.length === 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No hay productos todavía. La tabla existe; falta migrar datos desde
            SQLite.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#3D7A56]/20 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#3D7A56] text-white">
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
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 text-[#1f3d2c]"
                  >
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
      </main>
    </div>
  );
}
