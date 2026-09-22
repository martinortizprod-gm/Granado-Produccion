"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

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
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="g-label">
          Correo
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="g-input"
          placeholder="usuario@empresa.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="g-label">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="g-input pr-16"
            placeholder="Ingresá tu contraseña"
          />
          <button
            type="button"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={() => setShowPass((v) => !v)}
            tabIndex={-1}
          >
            {showPass ? "Ocultar" : "Ver"}
          </button>
        </div>
      </div>

      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="g-btn g-btn-primary w-full"
      >
        {loading ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
