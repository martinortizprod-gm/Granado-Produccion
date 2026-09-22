import { LoginForm } from "./login-form";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[#f4f7f5] px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-[#3D7A56]/20 bg-white p-8 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-[#3D7A56] uppercase">
          Granado Prod. Veterinario
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#1f3d2c]">
          Iniciar sesión
        </h1>
        <p className="mt-2 text-sm text-[#64748b]">
          Usá el correo y la contraseña creados en Supabase Auth (no la clave
          del sistema desktop).
        </p>

        <Suspense fallback={<p className="mt-6 text-sm text-slate-500">Cargando…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
