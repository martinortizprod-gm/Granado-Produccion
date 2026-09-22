import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MODULOS, ModuloId } from "@/lib/modulos";
import { PerfilSesion, puede } from "@/lib/auth/permisos";

export function AppShell({
  perfil,
  activo,
  children,
}: {
  perfil: PerfilSesion;
  activo: ModuloId;
  children: React.ReactNode;
}) {
  const visibles = MODULOS.filter((m) => puede(perfil, m.id, "ver"));
  const nombre =
    [perfil.nombre, perfil.apellido].filter(Boolean).join(" ") || perfil.email;

  return (
    <div className="flex min-h-full flex-1 bg-[var(--background)] text-[var(--foreground)]">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] md:flex">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <p className="text-[10px] font-medium tracking-wide text-[var(--granado)] uppercase">
            Granado Prod. Veterinario
          </p>
          <p className="mt-1 text-sm font-semibold">Producción</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {visibles.map((m) => {
              const on = m.id === activo;
              return (
                <li key={m.id}>
                  <Link
                    href={m.href}
                    className={`block rounded-md px-3 py-2 text-sm ${
                      on
                        ? "bg-[var(--granado)] font-medium text-white"
                        : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`}
                  >
                    {m.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{nombre}</p>
            <p className="truncate text-xs text-[var(--muted-fg)]">
              {perfil.rolNombre ?? "Sin rol"} · {perfil.email}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <div className="border-b border-[var(--border)] bg-[var(--card)] px-2 py-2 md:hidden">
          <div className="flex gap-1 overflow-x-auto">
            {visibles.map((m) => (
              <Link
                key={m.id}
                href={m.href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs ${
                  m.id === activo
                    ? "bg-[var(--granado)] text-white"
                    : "bg-[var(--muted)]"
                }`}
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>

        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
