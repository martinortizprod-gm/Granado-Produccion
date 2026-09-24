import { createClient } from "@/lib/supabase/server";
import { KindParte, PARTES, ParteVista, filaParte } from "@/lib/terceros/logic";

export async function cargarPartes(kind: KindParte): Promise<{
  items: ParteVista[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(PARTES[kind].tabla).select("*");
  if (error) return { items: [], error: error.message };
  const items = (data ?? [])
    .map((fila) => filaParte(fila as Record<string, unknown>))
    .filter((item): item is ParteVista => item != null);
  items.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return { items, error: null };
}
