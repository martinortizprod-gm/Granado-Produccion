-- Roles, permisos por módulo y vínculo con usuarios.
-- Pegar en Supabase → SQL Editor → Run (una vez).
-- Requiere: tablas existentes (usuarios) y Auth.

-- -----------------------------------------------------------------------------
create table if not exists public.roles (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  descripcion text,
  es_sistema boolean not null default false,
  fecha_registro text default to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

create table if not exists public.rol_permisos (
  id bigint generated always as identity primary key,
  id_rol bigint not null references public.roles (id) on delete cascade,
  modulo text not null,
  puede_ver boolean not null default false,
  puede_leer boolean not null default false,
  puede_editar boolean not null default false,
  unique (id_rol, modulo)
);

alter table public.usuarios
  add column if not exists id_rol bigint references public.roles (id),
  add column if not exists auth_user_id uuid unique;

create index if not exists idx_usuarios_mail on public.usuarios (mail);
create index if not exists idx_usuarios_auth on public.usuarios (auth_user_id);

-- -----------------------------------------------------------------------------
-- Rol Administrador (sistema)
insert into public.roles (nombre, descripcion, es_sistema)
values (
  'Administrador',
  'Acceso total a todos los módulos',
  true
)
on conflict (nombre) do nothing;

-- Rol Operario (base, editable)
insert into public.roles (nombre, descripcion, es_sistema)
values (
  'Operario',
  'Acceso limitado según permisos asignados',
  false
)
on conflict (nombre) do nothing;

-- Permisos full para Administrador
insert into public.rol_permisos (id_rol, modulo, puede_ver, puede_leer, puede_editar)
select r.id, m.modulo, true, true, true
from public.roles r
cross join (
  values
    ('inicio'),
    ('solicitudes'),
    ('ingredientes'),
    ('insumos'),
    ('envases'),
    ('etiquetas'),
    ('productos'),
    ('recetas'),
    ('movimientos'),
    ('planificacion'),
    ('produccion'),
    ('informes'),
    ('analytics'),
    ('usuarios'),
    ('respaldos')
) as m(modulo)
where r.nombre = 'Administrador'
on conflict (id_rol, modulo) do update set
  puede_ver = excluded.puede_ver,
  puede_leer = excluded.puede_leer,
  puede_editar = excluded.puede_editar;

-- Operario: ver/leer catálogos e inicio (sin edición ni usuarios)
insert into public.rol_permisos (id_rol, modulo, puede_ver, puede_leer, puede_editar)
select r.id, m.modulo, m.ver, m.leer, m.editar
from public.roles r
cross join (
  values
    ('inicio', true, true, false),
    ('productos', true, true, false),
    ('ingredientes', true, true, false),
    ('insumos', true, true, false),
    ('envases', true, true, false),
    ('etiquetas', true, true, false),
    ('solicitudes', false, false, false),
    ('recetas', false, false, false),
    ('movimientos', false, false, false),
    ('planificacion', false, false, false),
    ('produccion', false, false, false),
    ('informes', false, false, false),
    ('analytics', false, false, false),
    ('usuarios', false, false, false),
    ('respaldos', false, false, false)
) as m(modulo, ver, leer, editar)
where r.nombre = 'Operario'
on conflict (id_rol, modulo) do update set
  puede_ver = excluded.puede_ver,
  puede_leer = excluded.puede_leer,
  puede_editar = excluded.puede_editar;

-- Vincular usuarios existentes por campo rol de texto
update public.usuarios u
set id_rol = r.id
from public.roles r
where u.id_rol is null
  and lower(coalesce(u.rol, '')) = 'admin'
  and r.nombre = 'Administrador';

update public.usuarios u
set id_rol = r.id
from public.roles r
where u.id_rol is null
  and lower(coalesce(u.rol, '')) = 'operario'
  and r.nombre = 'Operario';

-- Alinear mail del admin Auth con la fila de usuarios (ajustá si hace falta)
update public.usuarios
set
  mail = 'martin.ortiz.prod@granadoprodvet.com.ar',
  rol = 'admin',
  id_rol = (select id from public.roles where nombre = 'Administrador' limit 1)
where id = 1;

-- -----------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.rol_permisos enable row level security;

drop policy if exists "dev_auth_all_roles" on public.roles;
drop policy if exists "dev_auth_all_rol_permisos" on public.rol_permisos;
drop policy if exists "dev_auth_select_roles" on public.roles;
drop policy if exists "dev_auth_select_rol_permisos" on public.rol_permisos;

create policy "dev_auth_select_roles"
  on public.roles for select to authenticated using (true);

create policy "dev_auth_select_rol_permisos"
  on public.rol_permisos for select to authenticated using (true);

-- Lectura de usuarios autenticados (gestión se hace con service role en servidor)
drop policy if exists "dev_auth_select_usuarios" on public.usuarios;
create policy "dev_auth_select_usuarios"
  on public.usuarios for select to authenticated using (true);
