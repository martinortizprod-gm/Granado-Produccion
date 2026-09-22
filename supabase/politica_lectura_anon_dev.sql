-- Política temporal de desarrollo: lectura pública (anon) de catálogos.
-- Pegar en Supabase → SQL Editor → Run
-- Más adelante se quita y queda solo authenticated / roles.

do $$
declare
  t text;
begin
  foreach t in array array[
    'catalogo_productos',
    'catalogo_ingredientes',
    'catalogo_insumos',
    'catalogo_envases',
    'catalogo_etiquetas',
    'catalogo_articulos',
    'catalogo_equipos'
  ]
  loop
    execute format(
      'drop policy if exists "dev_anon_select_%s" on public.%I',
      t, t
    );
    execute format(
      'create policy "dev_anon_select_%s" on public.%I for select to anon using (true)',
      t, t
    );
  end loop;
end $$;
