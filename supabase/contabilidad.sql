-- Contabilidad: formas de pago y ficha de cada ingreso de artículos.
-- Pegar en Supabase → SQL Editor → Run (se puede reejecutar).
-- No borra movimientos. Los comprobantes van al bucket privado "contabilidad".

create table if not exists public.formas_de_pago (
  id bigint primary key,
  forma_de_pago text not null unique
);

create table if not exists public.contable_movimientos (
  id bigint primary key,
  tabla_origen text not null,
  id_movimiento bigint not null,
  id_usuario_registro bigint not null,
  fecha_hora_registro timestamptz not null default now(),
  id_usuario_ultima_actualizacion bigint,
  fecha_hora_ultima_actualizacion timestamptz,
  numero_factura text,
  vencimiento_facturacion text,
  comprobante_remito text,
  comprobante_factura text,
  costo_sin_iva numeric,
  costo_iva numeric,
  monto_abonado numeric,
  id_forma_pago bigint,
  estado_facturacion text not null default 'pendiente',
  observaciones text,
  impacta boolean not null default true,
  moneda text not null default 'ARS',
  unique (tabla_origen, id_movimiento),
  constraint contable_movimientos_origen_chk check (
    tabla_origen in (
      'movimientos_ingredientes',
      'movimientos_insumos',
      'movimientos_envases',
      'movimientos_etiquetas'
    )
  ),
  constraint contable_movimientos_estado_chk check (
    estado_facturacion in ('pendiente', 'abonada', 'cancelada')
  )
);

create table if not exists public.contable_pagos (
  id bigint primary key,
  id_contable bigint not null,
  id_forma_pago bigint not null,
  monto numeric not null,
  moneda text not null default 'ARS',
  constraint contable_pagos_monto_chk check (monto >= 0)
);

create table if not exists public.contable_cotizacion (
  id bigint primary key,
  pesos_por_dolar numeric not null,
  fecha_hora_actualizacion timestamptz,
  id_usuario bigint,
  constraint contable_cotizacion_valor_chk check (pesos_por_dolar > 0)
);

alter table public.contable_movimientos
  add column if not exists impacta boolean not null default true;

alter table public.contable_movimientos
  add column if not exists moneda text not null default 'ARS';

alter table public.contable_pagos
  add column if not exists moneda text not null default 'ARS';

do $$
begin
  alter table public.contable_movimientos
    add constraint contable_movimientos_moneda_chk check (moneda in ('ARS', 'USD'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.contable_pagos
    add constraint contable_pagos_moneda_chk check (moneda in ('ARS', 'USD'));
exception when duplicate_object then null;
end $$;

-- Si la ficha tenía una sola forma, la copia como primer pago. No pisa pagos ya cargados.
insert into public.contable_pagos (id, id_contable, id_forma_pago, monto)
select
  coalesce((select max(p.id) from public.contable_pagos p), 0)
    + row_number() over (order by m.id),
  m.id,
  m.id_forma_pago,
  coalesce(m.monto_abonado, 0)
from public.contable_movimientos m
where m.id_forma_pago is not null
  and not exists (
    select 1 from public.contable_pagos p where p.id_contable = m.id
  );

insert into public.formas_de_pago (id, forma_de_pago)
values
  (1, 'Efectivo'),
  (2, 'Cheque'),
  (3, 'Credito'),
  (4, 'Debito'),
  (5, 'Transferencia'),
  (6, 'QR'),
  (7, 'Otras')
on conflict (id) do nothing;

alter table public.formas_de_pago enable row level security;
alter table public.contable_movimientos enable row level security;
alter table public.contable_pagos enable row level security;
alter table public.contable_cotizacion enable row level security;

drop policy if exists "dev_auth_all_formas_de_pago" on public.formas_de_pago;
create policy "dev_auth_all_formas_de_pago"
  on public.formas_de_pago
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "dev_auth_all_contable_movimientos" on public.contable_movimientos;
create policy "dev_auth_all_contable_movimientos"
  on public.contable_movimientos
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "dev_auth_all_contable_cotizacion" on public.contable_cotizacion;
create policy "dev_auth_all_contable_cotizacion"
  on public.contable_cotizacion
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "dev_auth_all_contable_pagos" on public.contable_pagos;
create policy "dev_auth_all_contable_pagos"
  on public.contable_pagos
  for all
  to authenticated
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('contabilidad', 'contabilidad', false)
on conflict (id) do nothing;

insert into public.rol_permisos (id_rol, modulo, puede_ver, puede_leer, puede_editar)
select r.id, 'contabilidad', true, true, true
from public.roles r
where r.nombre = 'Administrador'
on conflict (id_rol, modulo) do update set
  puede_ver = excluded.puede_ver,
  puede_leer = excluded.puede_leer,
  puede_editar = excluded.puede_editar;

insert into public.rol_permisos (id_rol, modulo, puede_ver, puede_leer, puede_editar)
select r.id, 'contabilidad', false, false, false
from public.roles r
where r.nombre = 'Operario'
on conflict (id_rol, modulo) do update set
  puede_ver = excluded.puede_ver,
  puede_leer = excluded.puede_leer,
  puede_editar = excluded.puede_editar;
