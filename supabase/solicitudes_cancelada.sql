-- Marca de solicitud cancelada.
-- Pegar en Supabase → SQL Editor → Run (se puede reejecutar).
-- No borra datos. Sin esta columna, guardar una solicitud falla.

alter table public.solicitudes
  add column if not exists cancelada boolean not null default false;
