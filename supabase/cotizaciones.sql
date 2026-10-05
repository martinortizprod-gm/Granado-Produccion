-- Cotizaciones: listas históricas de costo de ingredientes, fazón y
-- snapshots de cotización de producto. Pegar en Supabase → SQL Editor → Run
-- (se puede reejecutar). No modifica catálogos ni Contabilidad.
-- No confundir con contable_cotizacion (dólar).

create table if not exists public.cotiz_mp (
  id bigint primary key,
  fecha_hora_registro timestamptz not null default now(),
  id_usuario_registro bigint not null,
  observaciones text
);

create table if not exists public.cotiz_mp_items (
  id bigint primary key,
  id_cotiz_mp bigint not null,
  id_ingrediente bigint,
  codigo text,
  nombre text,
  costo_por_tn numeric not null default 0,
  constraint cotiz_mp_items_costo_chk check (costo_por_tn >= 0)
);

create table if not exists public.cotiz_fazon (
  id bigint primary key,
  fecha_hora_registro timestamptz not null default now(),
  id_usuario_registro bigint not null,
  observaciones text
);

create table if not exists public.cotiz_fazon_items (
  id bigint primary key,
  id_cotiz_fazon bigint not null,
  categoria text not null,
  capacidad_kg numeric not null,
  costo_por_tn numeric not null default 0,
  constraint cotiz_fazon_items_costo_chk check (costo_por_tn >= 0),
  constraint cotiz_fazon_items_cap_chk check (capacidad_kg > 0)
);

create table if not exists public.cotiz_producto (
  id bigint primary key,
  fecha_hora_registro timestamptz not null default now(),
  id_usuario_registro bigint not null,
  id_cotiz_mp bigint,
  id_cotiz_fazon bigint,
  id_producto bigint,
  codigo_producto text,
  producto text,
  categoria text,
  id_version bigint,
  version numeric,
  capacidad_kg numeric,
  toneladas numeric not null,
  costo_mp_tn numeric not null default 0,
  costo_fazon_tn numeric not null default 0,
  costo_tn numeric not null default 0,
  total numeric not null default 0,
  observaciones text,
  constraint cotiz_producto_tn_chk check (toneladas > 0)
);

create table if not exists public.cotiz_producto_items (
  id bigint primary key,
  id_cotiz_producto bigint not null,
  id_ingrediente bigint,
  codigo text,
  nombre text,
  participacion numeric not null default 0,
  costo_ingrediente_tn numeric not null default 0,
  costo_linea_tn numeric not null default 0
);

create index if not exists idx_cotiz_mp_items_lista on public.cotiz_mp_items (id_cotiz_mp);
create index if not exists idx_cotiz_fazon_items_lista on public.cotiz_fazon_items (id_cotiz_fazon);
create index if not exists idx_cotiz_producto_items_lista on public.cotiz_producto_items (id_cotiz_producto);

alter table public.cotiz_mp enable row level security;
alter table public.cotiz_mp_items enable row level security;
alter table public.cotiz_fazon enable row level security;
alter table public.cotiz_fazon_items enable row level security;
alter table public.cotiz_producto enable row level security;
alter table public.cotiz_producto_items enable row level security;

drop policy if exists "dev_auth_all_cotiz_mp" on public.cotiz_mp;
create policy "dev_auth_all_cotiz_mp"
  on public.cotiz_mp for all to authenticated using (true) with check (true);

drop policy if exists "dev_auth_all_cotiz_mp_items" on public.cotiz_mp_items;
create policy "dev_auth_all_cotiz_mp_items"
  on public.cotiz_mp_items for all to authenticated using (true) with check (true);

drop policy if exists "dev_auth_all_cotiz_fazon" on public.cotiz_fazon;
create policy "dev_auth_all_cotiz_fazon"
  on public.cotiz_fazon for all to authenticated using (true) with check (true);

drop policy if exists "dev_auth_all_cotiz_fazon_items" on public.cotiz_fazon_items;
create policy "dev_auth_all_cotiz_fazon_items"
  on public.cotiz_fazon_items for all to authenticated using (true) with check (true);

drop policy if exists "dev_auth_all_cotiz_producto" on public.cotiz_producto;
create policy "dev_auth_all_cotiz_producto"
  on public.cotiz_producto for all to authenticated using (true) with check (true);

drop policy if exists "dev_auth_all_cotiz_producto_items" on public.cotiz_producto_items;
create policy "dev_auth_all_cotiz_producto_items"
  on public.cotiz_producto_items for all to authenticated using (true) with check (true);

insert into public.rol_permisos (id_rol, modulo, puede_ver, puede_leer, puede_editar)
select r.id, 'cotizaciones', true, true, true
from public.roles r
where r.nombre = 'Administrador'
on conflict (id_rol, modulo) do update set
  puede_ver = excluded.puede_ver,
  puede_leer = excluded.puede_leer,
  puede_editar = excluded.puede_editar;

insert into public.rol_permisos (id_rol, modulo, puede_ver, puede_leer, puede_editar)
select r.id, 'cotizaciones', false, false, false
from public.roles r
where r.nombre = 'Operario'
on conflict (id_rol, modulo) do update set
  puede_ver = excluded.puede_ver,
  puede_leer = excluded.puede_leer,
  puede_editar = excluded.puede_editar;
