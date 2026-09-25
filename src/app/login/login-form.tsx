"use client";

import { IconEye } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

function IconoCorreo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function IconoCandado() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

function IconoFlecha() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 space-y-4">
      <div>
        <label htmlFor="email" className="g-label">
          Correo
        </label>
        <div className="relative text-[var(--color-text-muted)] focus-within:text-[var(--color-primary-muted)]">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
            <IconoCorreo />
          </span>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="g-input"
            style={{ paddingLeft: "2.4rem" }}
            placeholder="usuario@empresa.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="g-label">
          Contraseña
        </label>
        <div className="relative text-[var(--color-text-muted)] focus-within:text-[var(--color-primary-muted)]">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
            <IconoCandado />
          </span>
          <input
            id="password"
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="g-input"
            style={{ paddingLeft: "2.4rem", paddingRight: "2.6rem" }}
            placeholder="Ingresá tu contraseña"
          />
          <button
            type="button"
            className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <span className="relative inline-flex">
              <IconEye className="h-[18px] w-[18px]" />
              {showPass ? (
                <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 rotate-45 bg-current" />
              ) : null}
            </span>
          </button>
        </div>
      </div>

      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="g-btn g-btn-primary w-full"
        style={{
          height: 44,
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {loading ? (
          "Ingresando…"
        ) : (
          <>
            Ingresar
            <IconoFlecha />
          </>
        )}
      </button>
    </form>
  );
}
