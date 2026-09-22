-- Ajustes de tipos por datos reales de Excel/SQLite.
-- Pegar en Supabase → SQL Editor → Run

alter table public.catalogo_insumos
  alter column consumo_aprox type text
  using consumo_aprox::text;

alter table public.movimientos_insumos
  alter column id_insumo type text
  using id_insumo::text;
