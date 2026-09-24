-- Proveedores, clientes y columnas para usarlos en ingresos y solicitudes.
-- Pegar en Supabase → SQL Editor → Run (se puede reejecutar).
-- No borra datos.

create table if not exists public.proveedores (
  id bigint primary key,
  nombre text not null,
  razon_social text not null,
  cuit text,
  celular text,
  mail text,
  ubicacion text,
  observaciones text
);

create table if not exists public.clientes (
  id bigint primary key,
  nombre text not null,
  razon_social text not null,
  cuit text,
  celular text,
  mail text,
  ubicacion text,
  observaciones text
);

-- El ingreso de ingredientes ya tenía proveedor (texto).
-- Envases, etiquetas e insumos no: hace falta la columna para guardar el elegido.
alter table public.movimientos_envases
  add column if not exists proveedor text;

alter table public.movimientos_etiquetas
  add column if not exists proveedor text;

alter table public.movimientos_insumos
  add column if not exists proveedor text;

-- La solicitud no tenía cliente.
alter table public.solicitudes
  add column if not exists cliente text;

alter table public.proveedores enable row level security;
alter table public.clientes enable row level security;

drop policy if exists "dev_auth_all_proveedores" on public.proveedores;
create policy "dev_auth_all_proveedores"
  on public.proveedores
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "dev_auth_all_clientes" on public.clientes;
create policy "dev_auth_all_clientes"
  on public.clientes
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.rol_permisos (id_rol, modulo, puede_ver, puede_leer, puede_editar)
select r.id, m.modulo, true, true, true
from public.roles r
cross join (
  values
    ('proveedores'),
    ('clientes')
) as m(modulo)
where r.nombre = 'Administrador'
on conflict (id_rol, modulo) do update set
  puede_ver = excluded.puede_ver,
  puede_leer = excluded.puede_leer,
  puede_editar = excluded.puede_editar;

insert into public.rol_permisos (id_rol, modulo, puede_ver, puede_leer, puede_editar)
select r.id, m.modulo, true, true, false
from public.roles r
cross join (
  values
    ('proveedores'),
    ('clientes')
) as m(modulo)
where r.nombre = 'Operario'
on conflict (id_rol, modulo) do update set
  puede_ver = excluded.puede_ver,
  puede_leer = excluded.puede_leer,
  puede_editar = excluded.puede_editar;
