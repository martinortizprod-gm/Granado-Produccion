-- Permiso del módulo de prueba Consultas IA.
-- Correrlo en la base que ya está en uso. Se puede reejecutar.
-- El Administrador entra igual sin este script: la app le da todos los permisos.
-- El Operario queda sin acceso. No pisa un permiso que ya se haya guardado a mano.

insert into public.rol_permisos (id_rol, modulo, puede_ver, puede_leer, puede_editar)
select r.id, 'consultas-ia', true, true, true
from public.roles r
where r.nombre = 'Administrador'
on conflict (id_rol, modulo) do update set
  puede_ver = excluded.puede_ver,
  puede_leer = excluded.puede_leer,
  puede_editar = excluded.puede_editar;

insert into public.rol_permisos (id_rol, modulo, puede_ver, puede_leer, puede_editar)
select r.id, 'consultas-ia', false, false, false
from public.roles r
where r.nombre = 'Operario'
on conflict (id_rol, modulo) do nothing;
