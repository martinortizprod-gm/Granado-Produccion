-- Foto de perfil del usuario logueado.
-- Pegar en Supabase → SQL Editor → Run. Se puede reejecutar.
-- No agrega columnas: la ruta queda en los metadatos de Auth (avatar_path).

insert into storage.buckets (id, name, public)
values ('perfiles', 'perfiles', true)
on conflict (id) do update set public = true;
