import { BrandMark } from "@/components/ui/brand";
import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-1">
      <section className="relative z-10 flex min-h-dvh w-full flex-col overflow-y-auto bg-[var(--color-surface)] lg:w-[40%] lg:max-w-[520px] lg:min-w-[400px] lg:shrink-0 lg:shadow-[12px_0_40px_rgba(6,40,25,0.07)]">
        <div className="m-auto w-full max-w-[420px] px-6 py-8 sm:px-8 lg:max-w-none lg:px-10">
          <div className="flex items-center gap-3">
            <BrandMark size={52} />
            <div className="min-w-0">
              <p className="text-[15px] font-bold tracking-wide text-[var(--color-text)]">
                GRANADO
              </p>
              <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--color-text-muted)] uppercase">
                Productos Veterinarios
              </p>
            </div>
          </div>

          <div className={`${styles.marca} mt-6 h-0.5 w-8 rounded-full`} />

          <h1 className="mt-5 text-[2rem] leading-[1.08] font-bold tracking-tight text-[var(--color-text)] sm:text-[2.15rem]">
            Sistema de
            <br />
            <span className={styles.titulo}>Producción</span>
          </h1>

          <Suspense
            fallback={
              <p className="mt-7 text-[13px] text-[var(--color-text-muted)]">
                Cargando…
              </p>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-[10px] tracking-wide text-[var(--color-text-muted)]">
              Sistema de Producción
            </span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
        </div>
      </section>

      <aside
        className={`${styles.panel} relative hidden min-h-dvh min-w-0 flex-1 overflow-hidden lg:block`}
        aria-hidden="true"
      >
        <Image
          src="/login/Fondo-login02.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1023px) 0px, 62vw"
          className={styles.foto}
        />
      </aside>
    </div>
  );
}
