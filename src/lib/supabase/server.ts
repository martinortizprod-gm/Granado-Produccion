import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseEnvConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return (
    Boolean(url && key) &&
    /^https?:\/\//i.test(url) &&
    !url.includes("TU-PROYECTO")
  );
}

export async function createClient() {
  if (!supabaseEnvConfigured()) {
    throw new Error(
      "Configurá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local (valores reales de Supabase → Project Settings → API).",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // En Server Components a veces no se pueden setear cookies.
          }
        },
      },
    },
  );
}
