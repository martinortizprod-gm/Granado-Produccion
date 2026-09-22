import {
  createClient,
  supabaseEnvConfigured,
} from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const envOk = supabaseEnvConfigured();

  let productosCount: number | null = null;
  let errorMsg: string | null = null;

  if (envOk) {
    try {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from("catalogo_productos")
        .select("*", { count: "exact", head: true });

      if (error) {
        errorMsg = error.message;
      } else {
        productosCount = count ?? 0;
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Error al conectar";
    }
  } else {
    errorMsg =
      "URL inválida o incompleta en .env.local. Debe ser https://xxxx.supabase.co";
  }

  return (
    <div className="min-h-full bg-[#f4f7f5]">
      <header className="border-b border-[#3D7A56]/15 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#3D7A56] uppercase">
              Granado Prod. Veterinario
            </p>
            <h1 className="text-xl font-semibold text-[#1f3d2c]">
              Producción — Web
            </h1>
          </div>
          <Link
            href="/productos"
            className="rounded-md bg-[#3D7A56] px-4 py-2 text-sm font-medium text-white hover:bg-[#326448]"
          >
            Ver productos
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-lg border border-[#3D7A56]/20 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1f3d2c]">
            Estado de conexión
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-[#334155]">
            <li>
              Variables de entorno:{" "}
              <strong className={envOk ? "text-[#3D7A56]" : "text-red-600"}>
                {envOk ? "OK" : "Faltan NEXT_PUBLIC_SUPABASE_*"}
              </strong>
            </li>
            <li>
              Tabla <code>catalogo_productos</code>:{" "}
              {errorMsg ? (
                <strong className="text-red-600">{errorMsg}</strong>
              ) : productosCount === null ? (
                <span>—</span>
              ) : (
                <strong className="text-[#3D7A56]">
                  {productosCount} registro(s)
                </strong>
              )}
            </li>
          </ul>
          <p className="mt-4 text-sm text-[#64748b]">
            Si ves error de RLS / permission denied, ejecutá en Supabase el SQL
            de{" "}
            <code className="rounded bg-slate-100 px-1">
              supabase/politica_lectura_anon_dev.sql
            </code>
            . Las tablas siguen vacías hasta migrar datos desde SQLite.
          </p>
        </section>
      </main>
    </div>
  );
}
