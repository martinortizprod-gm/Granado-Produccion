import { BrandMark } from "@/components/ui/brand";
import { LoginForm } from "./login-form";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1">
      <aside
        className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden px-9 py-8 text-white lg:flex"
        style={{ background: "var(--color-sidebar)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--color-primary-muted) 0%, transparent 45%), radial-gradient(circle at 80% 70%, var(--color-primary-hover) 0%, transparent 40%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-2.5">
          <BrandMark size={42} className="bg-white/95 p-0.5 shadow-sm" />
          <div>
            <p className="text-[13px] font-bold tracking-wide">GRANADO</p>
            <p className="text-[10px] tracking-wider text-white/55 uppercase">
              Productos Veterinarios
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-sm">
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight">
            Sistema de{" "}
            <span style={{ color: "var(--color-accent-bar)" }}>Producción</span>
          </h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-white/70">
            Gestión ordenada de solicitudes, maestros y operación para una
            producción más eficiente.
          </p>
          <ul className="mt-6 space-y-2.5 text-[13px] text-white/80">
            {[
              "Procesos controlados en cada etapa.",
              "Datos unificados para operación y análisis.",
              "Identidad industrial Granado.",
            ].map((txt, i) => (
              <li key={txt} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold"
                  style={{ color: "var(--color-accent-bar)" }}
                >
                  {i + 1}
                </span>
                <span>{txt}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[11px] text-white/45">
          GRANADO PRODUCTOS VETERINARIOS S.R.L. · Villa María, Córdoba
        </p>
      </aside>

      <div
        className="relative flex flex-1 flex-col items-center justify-center px-4 py-8"
        style={{ background: "var(--color-background)" }}
      >
        <div className="relative z-10 mb-5 flex items-center gap-2 lg:hidden">
          <BrandMark size={36} />
          <div>
            <p className="text-[13px] font-bold">GRANADO</p>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase">
              Prod. Veterinario
            </p>
          </div>
        </div>

        <div className="g-card relative z-10 w-full max-w-[380px] px-6 py-6">
          <p
            className="text-[10px] font-semibold tracking-[0.08em] uppercase"
            style={{ color: "var(--color-primary-muted)" }}
          >
            Granado Prod. Veterinario
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--color-text)]">
            Iniciar sesión
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Ingresá con tu correo institucional.
          </p>

          <Suspense
            fallback={
              <p className="mt-5 text-[13px] text-[var(--color-text-muted)]">
                Cargando…
              </p>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-[10px] text-[var(--color-text-muted)]">
              Sistema de Producción
            </span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <p className="mt-2 text-center text-[10px] leading-snug text-[var(--color-text-muted)]">
            Usá el correo y la contraseña de Supabase Auth (no la clave del
            sistema desktop).
          </p>
        </div>
      </div>
    </div>
  );
}
