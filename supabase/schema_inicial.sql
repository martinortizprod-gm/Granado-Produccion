-- =============================================================================
-- Granado Producción — esquema inicial Supabase (espejo de data/sistema.db)
-- Pegar en: Supabase → SQL Editor → Run
--
-- Qué hace:
--   • Crea las mismas tablas/columnas que SQLite (sin datos de producción)
--   • PK en id (bigint) donde existe
--   • Tipos amplios (text/numeric) por compatibilidad con Excel/SQLite
--   • Activa RLS (sin políticas abiertas: hay que conectar Auth después)
--
-- Qué NO hace:
--   • No copia registros (eso es un paso aparte)
--   • No agrega columnas nuevas ni foreign keys inventadas
--   • No migra claves de usuarios (usaremos Supabase Auth)
-- =============================================================================

-- Orden: borrar si re-ejecutás este script en un proyecto de prueba
drop table if exists public.barridos_linea cascade;
drop table if exists public.catalogo_articulos cascade;
drop table if exists public.catalogo_envases cascade;
drop table if exists public.catalogo_equipos cascade;
drop table if exists public.catalogo_etiquetas cascade;
drop table if exists public.catalogo_ingredientes cascade;
drop table if exists public.catalogo_insumos cascade;
drop table if exists public.catalogo_productos cascade;
drop table if exists public.causas_paradas cascade;
drop table if exists public.consumo cascade;
drop table if exists public.limpieza_equipos cascade;
drop table if exists public.movimientos_envases cascade;
drop table if exists public.movimientos_etiquetas cascade;
drop table if exists public.movimientos_ingredientes cascade;
drop table if exists public.movimientos_insumos cascade;
drop table if exists public.movimientos_productos cascade;
drop table if exists public.paradas_no_programadas cascade;
drop table if exists public.paradas_programadas cascade;
drop table if exists public.planificacion_capacidades cascade;
drop table if exists public.planificacion_horarios cascade;
drop table if exists public.planificacion_mensual cascade;
drop table if exists public.planificacion_paradas cascade;
drop table if exists public.planificacion_rendimientos cascade;
drop table if exists public.produccion cascade;
drop table if exists public.recetas cascade;
drop table if exists public.registro_versiones cascade;
drop table if exists public.responsables_producciones cascade;
drop table if exists public.solicitudes cascade;
drop table if exists public.usuarios cascade;
drop table if exists public._meta_tablas cascade;
-- tablas_detalle es basura de Excel; no se migra a producción web

-- -----------------------------------------------------------------------------
create table public._meta_tablas (
  nombre text primary key not null,
  orden integer not null
);

create table public.barridos_linea (
  id bigint primary key,
  id_solicitud numeric,
  id_ingrediente numeric,
  pesaje_total numeric
);

create table public.catalogo_articulos (
  id bigint primary key,
  tipo_articulo text,
  id_origen numeric,
  codigo text,
  articulo text,
  medida text,
  estado text
);

create table public.catalogo_envases (
  id bigint primary key,
  fecha_registro text,
  codigo text,
  envase text,
  gestion text,
  capacidad_carga_kg numeric,
  medida text,
  estado text,
  categoria text
);

create table public.catalogo_equipos (
  id bigint primary key,
  equipo text
);

create table public.catalogo_etiquetas (
  id bigint primary key,
  fecha_registro text,
  codigo text,
  etiqueta text,
  gestion text,
  medida text,
  estado text,
  categoria text
);

create table public.catalogo_ingredientes (
  id bigint primary key,
  fecha_registro text,
  codigo text,
  ingrediente text,
  categoria text,
  gestion text,
  medida text,
  estado text
);

create table public.catalogo_insumos (
  id bigint primary key,
  fecha_registro text,
  codigo text,
  insumo text,
  gestion text,
  consumo_aprox numeric,
  medida text,
  estado text,
  categoria text
);

create table public.catalogo_productos (
  id bigint primary key,
  fecha_registro text,
  codigo text,
  producto text,
  "receta_PLC" text,
  medida text,
  categoria text,
  id_envase numeric,
  id_etiqueta numeric
);

create table public.causas_paradas (
  id bigint primary key,
  causa text
);

create table public.consumo (
  id bigint primary key,
  fecha_registro text,
  id_solicitud numeric,
  id_articulo numeric,
  lote_articulo text,
  cantidad numeric,
  pallet_inicio numeric,
  pallet_fin numeric
);

create table public.limpieza_equipos (
  id bigint primary key,
  fecha_registro text,
  id_solicitud numeric,
  id_equipo numeric
);

create table public.movimientos_envases (
  id bigint primary key,
  tipo text,
  fecha_registro text,
  fecha_vencimiento text,
  id_envase numeric,
  categoria text,
  lote text,
  cantidad numeric,
  remito text,
  gestion text,
  observaciones text
);

create table public.movimientos_etiquetas (
  id bigint primary key,
  tipo text,
  fecha_registro text,
  fecha_vencimiento text,
  id_etiqueta numeric,
  lote text,
  cantidad numeric,
  remito text,
  observaciones text
);

create table public.movimientos_ingredientes (
  id bigint primary key,
  tipo text,
  fecha_registro text,
  fecha_vencimiento text,
  id_ingrediente numeric,
  lote text,
  peso_total numeric,
  remito text,
  proveedor text,
  observaciones text
);

create table public.movimientos_insumos (
  id bigint primary key,
  tipo text,
  fecha_registro text,
  fecha_vencimiento text,
  id_insumo numeric,
  insumo text,
  categoria text,
  lote text,
  cantidad numeric,
  remito text,
  gestion text,
  observaciones text
);

create table public.movimientos_productos (
  id bigint primary key,
  tipo text,
  fecha_registro text,
  fecha_vencimiento text,
  id_producto numeric,
  lote text,
  stk_pall numeric,
  stk_un numeric,
  stk_kg numeric,
  observaciones text
);

create table public.paradas_no_programadas (
  id bigint primary key,
  id_produccion numeric,
  id_causas numeric,
  tiempo_en_hs numeric,
  descripcion text
);

create table public.paradas_programadas (
  id bigint primary key,
  id_produccion numeric,
  id_causas numeric,
  tiempo_en_hs numeric,
  descripcion text
);

create table public.planificacion_capacidades (
  id bigint primary key,
  categoria text,
  kg_por_pallet numeric,
  kg_por_batch numeric
);

create table public.planificacion_horarios (
  id bigint primary key,
  dia_semana text,
  horas_disponibles numeric
);

create table public.planificacion_mensual (
  id bigint primary key,
  fecha text,
  disponibilidad_operarios_estimada numeric,
  horas_disponibles numeric,
  horas_paradas_programadas numeric,
  horas_productivas numeric,
  observaciones text,
  categoria text,
  pallets_estimados numeric,
  kg_estimados numeric
);

create table public.planificacion_paradas (
  id bigint primary key,
  dia_semana text,
  cantidad_operarios numeric,
  causa text,
  horas numeric
);

create table public.planificacion_rendimientos (
  id bigint primary key,
  cantidad_operarios numeric,
  categoria text,
  pallets_hora numeric
);

create table public.produccion (
  id bigint primary key,
  fecha_registro text,
  id_solicitud numeric,
  pallets numeric,
  unidades numeric,
  peso_kg numeric,
  hs_disponibles numeric,
  hs_productivas numeric,
  hs_paradas_programadas numeric,
  hs_paradas_no_p numeric,
  rendimiento_kg_h numeric
);

create table public.recetas (
  id bigint primary key,
  fecha_registro text,
  id_version numeric,
  tipo_ingrediente text,
  puesto text,
  id_ingrediente numeric,
  participacion numeric
);

create table public.registro_versiones (
  id bigint primary key,
  fecha_registro text,
  version text,
  id_producto numeric,
  estado text
);

create table public.responsables_producciones (
  id bigint primary key,
  id_solicitud numeric,
  id_usuario numeric,
  responsabilidad text
);

create table public.solicitudes (
  id bigint primary key,
  fecha_registro text,
  orden_compra text,
  lote text,
  orden_produccion text,
  id_producto numeric,
  id_version numeric,
  pallets_cargados numeric,
  unidades_por_pallets numeric,
  peso_unitario numeric,
  unidades_cargadas numeric,
  peso_total numeric,
  fecha_estimada text,
  fecha_fin text,
  pallets_pendientes numeric
);

-- Perfil operativo (espejo desktop). La clave NO se usa en web:
-- el login irá por auth.users de Supabase.
create table public.usuarios (
  id bigint primary key,
  fecha_registro text,
  nombre text,
  apellido text,
  rol text,
  contacto text,
  clave text,
  mail text
);

-- -----------------------------------------------------------------------------
-- RLS: tablas cerradas hasta definir Auth + políticas por rol
-- -----------------------------------------------------------------------------
alter table public._meta_tablas enable row level security;
alter table public.barridos_linea enable row level security;
alter table public.catalogo_articulos enable row level security;
alter table public.catalogo_envases enable row level security;
alter table public.catalogo_equipos enable row level security;
alter table public.catalogo_etiquetas enable row level security;
alter table public.catalogo_ingredientes enable row level security;
alter table public.catalogo_insumos enable row level security;
alter table public.catalogo_productos enable row level security;
alter table public.causas_paradas enable row level security;
alter table public.consumo enable row level security;
alter table public.limpieza_equipos enable row level security;
alter table public.movimientos_envases enable row level security;
alter table public.movimientos_etiquetas enable row level security;
alter table public.movimientos_ingredientes enable row level security;
alter table public.movimientos_insumos enable row level security;
alter table public.movimientos_productos enable row level security;
alter table public.paradas_no_programadas enable row level security;
alter table public.paradas_programadas enable row level security;
alter table public.planificacion_capacidades enable row level security;
alter table public.planificacion_horarios enable row level security;
alter table public.planificacion_mensual enable row level security;
alter table public.planificacion_paradas enable row level security;
alter table public.planificacion_rendimientos enable row level security;
alter table public.produccion enable row level security;
alter table public.recetas enable row level security;
alter table public.registro_versiones enable row level security;
alter table public.responsables_producciones enable row level security;
alter table public.solicitudes enable row level security;
alter table public.usuarios enable row level security;

-- Política temporal de desarrollo: usuarios autenticados pueden leer/escribir.
-- Más adelante se restringe por rol (admin / operario).
do $$
declare
  t text;
begin
  foreach t in array array[
    '_meta_tablas',
    'barridos_linea',
    'catalogo_articulos',
    'catalogo_envases',
    'catalogo_equipos',
    'catalogo_etiquetas',
    'catalogo_ingredientes',
    'catalogo_insumos',
    'catalogo_productos',
    'causas_paradas',
    'consumo',
    'limpieza_equipos',
    'movimientos_envases',
    'movimientos_etiquetas',
    'movimientos_ingredientes',
    'movimientos_insumos',
    'movimientos_productos',
    'paradas_no_programadas',
    'paradas_programadas',
    'planificacion_capacidades',
    'planificacion_horarios',
    'planificacion_mensual',
    'planificacion_paradas',
    'planificacion_rendimientos',
    'produccion',
    'recetas',
    'registro_versiones',
    'responsables_producciones',
    'solicitudes',
    'usuarios'
  ]
  loop
    execute format(
      'create policy "dev_auth_all_%s" on public.%I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;
