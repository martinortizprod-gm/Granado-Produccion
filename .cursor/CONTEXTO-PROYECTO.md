# Contexto del proyecto — Granado Producción

**Para un chat nuevo:** leé este archivo completo **y** todas las rules de `.cursor/rules/` antes de codear. Este documento orienta; las rules mandan si hay conflicto.

- Workspace: `C:\Produccion-Granado\Py-Produccion`
- Repo Git (raíz = app Next.js): `https://github.com/martinortizprod-gm/Granado-Produccion.git`
- Deploy: Vercel (`vercel.json` → framework `nextjs`)

---

## 1. Para qué sirve el sistema

Sistema interno de **Granado Prod. Vet.** para gestionar la producción de **alimentos para bovinos**.

No es un sitio comercial. Es una app operativa: stock, solicitudes, recetas, planificación, registro de jornadas, movimientos, analítica y respaldos.

Usuarios típicos: administración y operarios de planta. Densidad de pantalla pensada para **~1366×768**.

---

## 2. Reglas (siempre)

Vivir en `.cursor/rules/`. Aplicarlas en **cada** pedido, aunque este archivo no las repita todas.

| Archivo | Alcance |
|---------|---------|
| `flujo-trabajo.mdc` | Siempre. Español. Sin commit/push salvo pedido. Leer columnas reales. Cambios chicos. Al terminar: 1–3 frases y esperar revisión del usuario. |
| `excel-y-datos.mdc` | Siempre. Persistencia = Supabase. No inventar tablas/columnas/estados. No segundo sistema de persistencia. Lo producido se calcula desde Producción cuando coincide el lote. |
| `verificacion-manual.mdc` | Siempre. No ejecutar la app, no capturas, no smoke tests, no `next dev`. El usuario abre el sistema y dice si quedó bien. |
| `ui-web-granado.mdc` | Al tocar `src/**`. Sistema de diseño de `docs/UI_DESIGN_SYSTEM.md`. No tocar Auth/SQL/lógica por un cambio visual. |

**Prioridad:** código y datos reales > pedido funcional > imagen/mockup (solo lenguaje visual).

**No hacer (resumen):**

- Inventar campos, tablas, estados o relaciones porque un mockup los muestre.
- Agregar columnas a la base en silencio (si hace falta, explicarlo **antes**).
- Crear otra persistencia (Excel, SQLite, JSON propio, etc.).
- Duplicar rutas o permisos: usar `src/lib/modulos.ts` (`MODULOS` + `GRUPOS_NAV`).
- Usar el logo de hoja de los mockups. Logo oficial: `public/brand/granado-icon.png`.
- Dejar scripts temporales (`_test_*`, `_analizar_*`) ni capturas en `docs/`.
- Commitear o pushear sin que el usuario lo pida.
- Documentación extra no pedida.

---

## 3. Lenguajes y stack

| Capa | Tecnología | Notas |
|------|------------|--------|
| UI / app | **TypeScript** (strict) + **React 19.2.8** | App Router de Next.js |
| Framework | **Next.js 16.3.5** | `src/app/`, alias `@/*` → `src/*` |
| Estilos | **Tailwind CSS 4** + tokens en `src/app/globals.css` | Sin `tailwind.config.js`. Clases propias `.g-*` |
| Auth | **Supabase Auth** | Email + contraseña. No usar `usuarios.clave` |
| Base de datos | **Supabase (PostgreSQL)** | Única persistencia operativa |
| Clientes | `@supabase/ssr` ^0.12.7, `@supabase/supabase-js` ^2.117.0 | Browser / server / admin |
| SQL | PostgreSQL en `supabase/*.sql` | Se ejecuta en el SQL Editor de Supabase |
| Migración histórica | **Python** (`scripts/migrar_sqlite_a_supabase.py`) | Solo para cargar el SQLite viejo; no es la app |
| Lint | ESLint 9 + `eslint-config-next` 16.3.5 | |
| Fuentes | Geist / Geist Mono (`next/font/google`) | |

No hay shadcn, Zustand, React Query ni librería de iconos. Iconos: SVG en `src/components/ui/icons.tsx`.

**Scripts npm:** `dev`, `build`, `start`, `lint`.

**Local:**

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abrir http://localhost:3000 → redirige a `/login`.

---

## 4. Qué no es este repo

Hubo un sistema de escritorio en **Python + CustomTkinter + SQLite** (`data/sistema.db`). Ese código **ya no está en este proyecto**: el usuario lo archivó fuera (antes vivía en `Obsoleto/`).

- Este repo **es solo el sistema web**.
- El esquema Supabase **espeja** las tablas históricas del SQLite. No reabrir ni “mejorar” el desktop.
- El script `scripts/migrar_sqlite_a_supabase.py` todavía menciona `Obsoleto/.../data/sistema.db`. Si hay que migrar de nuevo, actualizar esa ruta al lugar donde quedó el archivo.

---

## 5. Estructura del repo

```
Py-Produccion/
├── src/
│   ├── app/                 # Rutas (App Router), pages, server actions, API
│   ├── components/          # Shell, tema, primitivas UI
│   ├── lib/                 # Auth, Supabase, lógica por dominio
│   └── middleware.ts        # Sesión Supabase
├── supabase/                # SQL: esquema, roles, parches
├── scripts/                 # Migración SQLite → Supabase (Python)
├── docs/                    # UI_DESIGN_SYSTEM.md + mockups de referencia visual
├── public/brand/            # Logo fábrica granado-icon.png
├── public/login/            # Fondo del Login (Fondo-login02.png)
├── .cursor/rules/           # Rules del agente
├── .cursor/CONTEXTO-PROYECTO.md   # Este archivo
├── .env.example             # Plantilla de env (no secretos)
├── package.json
└── vercel.json
```

**Por dominio en `src/lib/`:** suele haber `data.ts` (lectura Supabase) y `logic.ts` (cálculos/vistas). Reutilizar; no inventar otra capa.

**Env (`.env.example` → `.env.local`, no commitear):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; en Vercel sin `NEXT_PUBLIC_`)

`.gitignore` ignora `.env*` y `/Obsoleto/` (por si reaparece la carpeta).

---

## 6. Arquitectura (cómo corre un pedido)

```
Login (client) → Supabase Auth → cookies
       ↓
middleware.ts → ¿hay usuario? si no → /login
       ↓
page.tsx (server) → getPerfilSesion() → usuarios + roles + rol_permisos
       ↓
puede(perfil, modulo, accion) → arma la UI / carga datos
       ↓
componente client → interacción
       ↓
server action → requirePermiso() → createClient() o createAdminClient()
       ↓
Supabase PostgreSQL
```

- El middleware **solo** autentica (hay sesión o no). **No** chequea roles.
- Los permisos se aplican en pages y actions.
- RLS está prendido; en dev hay políticas amplias para `authenticated`. La regla fina de “este rol ve este módulo” vive en **la app**, no en RLS.
- Escrituras sensibles (usuarios, roles) van con `createAdminClient()` (service role).

Archivos clave de infra:

| Archivo | Rol |
|---------|-----|
| `src/middleware.ts` | Llama `updateSession()` |
| `src/lib/supabase/middleware.ts` | Refresca sesión; redirige |
| `src/lib/supabase/server.ts` | Cliente server (cookies) |
| `src/lib/supabase/client.ts` | Cliente browser (login) |
| `src/lib/supabase/admin.ts` | Service role (solo servidor) |
| `src/lib/auth/permisos.ts` | `getPerfilSesion`, `requirePermiso` |
| `src/lib/auth/permisos-core.ts` | `puede()`, tipo `PerfilSesion` |
| `src/lib/modulos.ts` | Lista de módulos + grupos del menú |
| `src/components/app-shell.tsx` | Sidebar, header, filtro de menú por permiso. El círculo del usuario (foto o iniciales) abre `/perfil`. |

---

## 7. Auth, usuarios y permisos

**Login:** correo y contraseña de **Supabase Auth** (`signInWithPassword`). No es la clave del desktop.

**Callback:** `src/app/auth/callback/route.ts` (`exchangeCodeForSession`). Configurar redirect `/auth/callback` en Supabase (local y Vercel).

**Logout:** `src/app/logout/actions.ts` → `/login`.

**Mi perfil:** `/perfil` (no es un módulo ni pide permiso; cualquier usuario logueado). UI: `src/app/perfil/page.tsx` + `perfil-client.tsx`. Actions: `guardarMiPerfil`, `cambiarMiClave`, `guardarMiFoto`, `quitarMiFoto`. Lectura extra (contacto, fecha): `src/lib/auth/mi-perfil.ts`.

- Edita su fila de `usuarios`: nombre, apellido, mail y contacto. Si cambia el mail, también se actualiza el email de Auth (`email_confirm: true`); es el correo de ingreso.
- Rol y fecha de registro se muestran deshabilitados. El rol no se cambia en esta pantalla, ni siendo administrador.
- Solo el rol **Administrador** (`esAdministrador`) puede asignar o cambiar el rol de cualquier usuario, en `/usuarios` (`crearUsuarioApp` / `actualizarUsuarioApp`). Quien tenga permiso de editar Usuarios pero no sea Administrador no asigna rol.
- Contraseña: primero `signInWithPassword` con la actual. Si no coincide, no se cambia. Si coincide, `updateUserById` y un nuevo ingreso con la contraseña nueva. Mínimo 6 caracteres. No usa `usuarios.clave`.
- Foto: JPG, PNG o WEBP, hasta 2 MB. Bucket público `perfiles` (`supabase/perfil.sql`, hay que correrlo en la base en uso). Ruta `{authUserId}/avatar.ext` en `user_metadata` (`avatar_path`, `avatar_v`). Sin columna nueva. `getPerfilSesion` arma `fotoUrl` (`src/lib/auth/foto-perfil.ts`) para el encabezado.

**Perfil (`getPerfilSesion`):**

1. Email de Auth.
2. Fila en `usuarios` por `auth_user_id`. Si no hay, por `mail` (sin importar mayúsculas).
3. Si falta `auth_user_id`, lo vincula al UUID de Auth.
4. Rol: `id_rol` → tabla `roles`. Fallback: `usuarios.rol = 'admin'`.
5. Permisos: filas de `rol_permisos` para ese rol.
6. Si es Administrador, todos los permisos quedan en `true`.
7. `fotoUrl` sale de `user_metadata.avatar_path` (bucket `perfiles`), o null.

**Tablas de permisos** (`supabase/roles_y_permisos.sql`):

- `roles`: `id`, `nombre`, `descripcion`, `es_sistema`, `fecha_registro`
- `rol_permisos`: `id_rol`, `modulo`, `puede_ver`, `puede_leer`, `puede_editar` (único `id_rol + modulo`)
- `usuarios` también tiene `id_rol`, `auth_user_id` y el texto legacy `rol` (`admin` / `operario`)

**Acciones:** `ver` | `leer` | `editar` (`puede()`):

- Admin → siempre sí
- `ver` → ver **o** leer **o** editar
- `leer` → leer **o** editar
- `editar` → solo editar

**Roles seed:** Administrador (sistema, todo) y Operario (ver/leer catálogos, proveedores, clientes, inicio y productos). El script `supabase/proveedores_y_clientes.sql` inserta esos permisos en una base que ya tenía roles. Un rol custom no los tiene hasta que se guarden en Usuarios.

**Patrón en cada página:**

```ts
const perfil = await getPerfilSesion();
if (!perfil || !puede(perfil, "<modulo>", "ver")) redirect("/");
// sin "leer": UI sin datos
// al client: puedeEditar={puede(perfil, "<modulo>", "editar")}
```

El menú del shell lista solo módulos con `puede(..., "ver")`.

Módulo nuevo: registrarlo en `MODULOS` + `GRUPOS_NAV` **y** en `roles_y_permisos.sql` si lleva permiso.

---

## 8. Módulos (rutas reales)

Definidos en `src/lib/modulos.ts`. Grupos del menú (solo visual): Operación, Maestros, Análisis, Contabilidad, Sistema.

| Módulo | Ruta | Qué hace |
|--------|------|----------|
| Inicio | `/` | Dashboard: KPIs, actividad, accesos según permiso. |
| Solicitudes | `/solicitudes` | Pedidos de producción. Alta `/solicitudes/nueva`, edición `/solicitudes/[id]/editar`. El formulario elige **cliente** de `clientes` (opcional). Se guarda el nombre en `solicitudes.cliente` y se ve en la grilla y en el detalle. |
| Producción | `/produccion` | Jornada por solicitud/lote: pallets, horas, paradas, consumos, barridos, responsables, cierre de stock. |
| Movimientos | `/movimientos` | Ingresos/egresos de ingredientes, insumos, envases, etiquetas, productos. En un **ingreso** de ingrediente, envase, etiqueta o insumo, Proveedor es un desplegable de `proveedores` (opcional). El egreso de ingredientes sigue siendo texto libre. La grilla de esos cuatro tipos muestra la columna Proveedor (también en el selector de columnas y en el detalle). Productos no tienen proveedor. |
| Planificación | `/planificacion` | Plan mensual (`planificacion_*`): generar/recalcular mes, rendimientos, horarios, paradas. Query `?mes=&ops=`. |
| Informes | `/informes` | Tres fichas operativas (no es un segundo Analytics). Lee con `cargarProduccion()`. Lo producido sale de las jornadas de esa solicitud. Exporta Excel/PDF con `DialogoInforme`. |
| Ingredientes / Insumos / Envases / Etiquetas | `/ingredientes` etc. | Misma plantilla `src/app/catalogo/`. CRUD del catálogo + stock. |
| Proveedores / Clientes | `/proveedores`, `/clientes` | Plantilla compartida `src/app/terceros/` + `src/lib/terceros/`. Menú Maestros. CRUD: nombre y razón social obligatorios; CUIT, celular, mail, ubicación y observaciones opcionales. El nombre no se repite (comparación sin mayúsculas, solo en la app). |
| Productos | `/productos` | Productos terminados, stock (movimientos + cierres), vínculo envase/etiqueta. |
| Recetas | `/recetas` | Versiones (`registro_versiones`) y líneas (`recetas`) por producto. |
| Data Analytics | `/analytics` | Tabs: producción, stock, trazabilidad, reportes. |
| Contabilidad | `/contabilidad` | Cuatro solapas (ingredientes, envases, etiquetas, insumos). Cada una lista los ingresos de ese tipo, abre en el mes en curso y, por defecto, solo los que **impactan**. No impacta pone los costos en cero (artículos de clientes que no se pagan). Costos y pagos llevan moneda ARS o USD. La cotización (pesos por dólar) vive en `contable_cotizacion` y los totales de la grilla se muestran en pesos. Eliminar la ficha no borra el movimiento. |
| Usuarios | `/usuarios` | Roles, permisos, altas. Crea user en Auth + fila `usuarios`. Service role. Asignar o cambiar el rol de un usuario solo lo puede el rol Administrador. |
| Respaldos | `/respaldos` | Export xlsx / pdf / sql / json (`POST /api/respaldos`). |

**Informes (detalle):**

- UI: `src/app/informes/page.tsx` + `informes-client.tsx`. Lógica: `src/lib/informes/logic.ts` + `exportar.ts`. Infra de baja: `src/lib/informes/descarga.ts` + `emision.ts` (también la usan otros módulos).
- **Hoja de lote:** un lote (solicitud). Cabecera, jornadas (kg, pallets, unidades, hs disponibles, hs productivas, hs paradas prog., hs paradas no prog., kg/h), consumos, paradas (columnas hs progr. / hs no progr.), responsables, barridos, limpieza.
- **Consumo vs receta:** teórico = `participacion × kg producidos` de la versión (`formulas` / `recetas`). Real = `consumo` de ingredientes de esas jornadas. Lo que no está en la receta se marca “Fuera de receta”.
- **Solicitudes vs producido:** período (desde/hasta). Kg pedidos vs kg de jornadas por lote. Sin jornada, producido = 0. Filtro de fechas = el de solicitudes (`fecha_estimada` / `fecha_fin` / `fecha_registro`).
- No hay server actions propias (solo lectura). No inventar tablas ni un stock paralelo.

Casi todas las pages son Server Components con `dynamic = "force-dynamic"` y un `*-client.tsx`.

**Server actions** (en `src/app/<modulo>/actions.ts`):

- solicitudes: `crearSolicitud`, `actualizarSolicitud`, `eliminarSolicitud`, `solicitudTieneProduccion`
- catalogo: `guardarCatalogo`, `eliminarCatalogo`
- terceros (`src/app/terceros/actions.ts`, lo usan `/proveedores` y `/clientes`): `guardarParte`, `eliminarParte`
- productos: `guardarProducto`, `eliminarProducto`
- recetas: `guardarVersion`, `eliminarVersion`, `guardarLinea`, `eliminarLinea`
- movimientos: `guardarMovimiento`, `eliminarMovimiento` (si el movimiento deja de ser ingreso, o se elimina, también se borra su ficha contable)
- contabilidad: `guardarContable`, `eliminarContable`, `marcarImpacto`, `actualizarDolar`, `abrirComprobante`
- planificacion: `generarMes`, `recalcularMes`, `guardarDia`, `alternarContempla`, `asignarCategoria`, `eliminarDia`, `guardarRendimientos`, `guardarCapacidades`, `guardarHorarios`, `guardarParadas`
- produccion: `registrarJornada`, `eliminarJornada`, `guardarPrevios`, `agregarCatalogoPrevio`
- usuarios: `listarRoles`, `listarPermisosRol`, `guardarRol`, `eliminarRol`, `listarUsuariosApp`, `crearUsuarioApp`, `actualizarUsuarioApp` (el rol solo si `esAdministrador`)
- perfil (`src/app/perfil/actions.ts`, no es módulo): `guardarMiPerfil`, `cambiarMiClave`, `guardarMiFoto`, `quitarMiFoto`

Antes de inventar una action, buscar si ya existe.

---

## 9. Datos (tablas reales)

Esquema: `supabase/schema_inicial.sql` (32 tablas, incluidas `proveedores` y `clientes`). Roles: `supabase/roles_y_permisos.sql` (`roles`, `rol_permisos`).

**No migrar** `tablas_detalle` (basura de Excel).

**Catálogos:** `catalogo_articulos`, `catalogo_envases`, `catalogo_equipos`, `catalogo_etiquetas`, `catalogo_ingredientes`, `catalogo_insumos`, `catalogo_productos`

**Operación:** `solicitudes`, `produccion`, `consumo`, `barridos_linea`, `limpieza_equipos`, `responsables_producciones`, `paradas_programadas`, `paradas_no_programadas`, `causas_paradas`

**Recetas:** `registro_versiones`, `recetas`

**Stock:** `movimientos_ingredientes`, `movimientos_insumos`, `movimientos_envases`, `movimientos_etiquetas`, `movimientos_productos`. Las cuatro primeras tienen `proveedor text` (ingredientes ya lo tenía; las otras tres se agregaron en `proveedores_y_clientes.sql`). No es FK: se guarda el **nombre** del proveedor. Si después se renombra el maestro, el movimiento conserva el texto anterior y, al editarlo, sigue apareciendo como opción.

**Maestros de terceros:** `proveedores` y `clientes`, misma forma. `id bigint` (la app asigna `max(id)+1`), `nombre text not null`, `razon_social text not null`, `cuit`, `celular`, `mail`, `ubicacion`, `observaciones` (text, null). `solicitudes.cliente text` guarda el nombre del cliente, también sin FK.

**Planificación:** `planificacion_mensual`, `planificacion_capacidades`, `planificacion_horarios`, `planificacion_paradas`, `planificacion_rendimientos`

**Contabilidad:** `formas_de_pago`, `contable_movimientos`, `contable_pagos`, `contable_cotizacion`. No están en `schema_inicial.sql`. La ficha no copia el movimiento: se une por `tabla_origen` + `id_movimiento`. `impacta` nace en true. `moneda` del costo y de cada pago es `ARS` o `USD`. `contable_cotizacion` es una sola fila (`id = 1`, `pesos_por_dolar`). Costo total, abonado y pendiente de la grilla se calculan en pesos. Comprobantes en el bucket privado `contabilidad`.

**Otros:** `usuarios`, `_meta_tablas`

**SQL extra:**

- `supabase/fix_tipos_texto.sql` — tipos text en columnas que lo necesitaron
- `supabase/proveedores_y_clientes.sql` — **correrlo en la base que ya está en uso** (no reejecutar `schema_inicial.sql`, que borra tablas). Crea `proveedores` y `clientes`, agrega `proveedor` en movimientos de envases/etiquetas/insumos, agrega `cliente` en solicitudes, políticas RLS de desarrollo y permisos de Administrador y Operario. Se puede reejecutar.
- `supabase/contabilidad.sql` — **correrlo en la base que ya está en uso** (también si ya se corrió antes: agrega `contable_pagos`). Crea `formas_de_pago`, `contable_movimientos` (`impacta`, `moneda`), `contable_pagos` (forma, monto y moneda) y `contable_cotizacion` (pesos por dólar), el bucket privado `contabilidad` y el permiso del módulo (Administrador sí, Operario no). Se puede reejecutar. La ficha se ata con `tabla_origen` + `id_movimiento`.
- `supabase/politica_lectura_anon_dev.sql` — lectura anon temporal de catálogos (solo dev)
- `supabase/perfil.sql` — **correrlo en la base que ya está en uso**. Crea el bucket público `perfiles` para la foto del usuario logueado. No agrega columnas. Se puede reejecutar.

**Regla de negocio clave:** una sola fuente de verdad para **lo producido**: se calcula desde **Producción** cuando el lote coincide. No inventar un stock paralelo.

Tipos en SQL suelen ser amplios (`text` / `numeric`) por compatibilidad con el Excel/SQLite viejo. No “normalizar” tipos ni agregar FK inventadas sin pedirlo.

IDs de usuarios en altas web: `max(id)+1` (compatibilidad con IDs del desktop).

---

## 10. UI (cómo debe verse y armarse)

Fuente visual: `docs/UI_DESIGN_SYSTEM.md`. Tokens y clases: `src/app/globals.css`.

- Verde Granado. Naranja = pendiente. Rojo = error.
- Tema claro/oscuro: `TemaProvider`, clase `html.oscuro`, `localStorage` `granado-tema`.
- Sidebar siempre oscuro; grupos de `GRUPOS_NAV`; no cambiar grupos/iconos/activo salvo pedido.
- Controles ~36px; gaps 8/12/16; `.g-stack` entre bloques.
- Tablas: `.g-table-wrap` + `.g-table-scroll` + `.g-table` + header sticky. `ColumnPicker` + `useColumnVisibility`. Detalle: `RowDetailButton` / `RecordDetailDrawer` **solo con campos reales**.
- Filtros: `.g-filters`. En PC (≥1024px) una fila; en tablet/móvil, apilados.
- Login: sin AppShell. Desde `lg` (≥1024 px) el formulario queda a la izquierda (~40 %, tope 520 px) y la imagen industrial a la derecha (`public/login/Fondo-login02.png`, origen `docs/img/Fondo-login02.png`). Se muestra entera (`object-fit: contain`, apoyada abajo); el verde de arriba es el cielo de la foto. En tablet chica y móvil solo el formulario. Estilos locales en `src/app/login/login.module.css`. Sin animación ni SVG. Auth igual: `signInWithPassword`. No hay “recordar sesión”, “olvidé contraseña” ni nota de Supabase en la pantalla.
- Resto de pantallas autenticadas: envolver con `AppShell`.

Mockups en `docs/` (ventanas, imgs) = **referencia visual**, no especificación de pantallas ni de datos.

---

## 11. Cómo implementar en este repo

1. Leé este archivo + las rules.
2. Leé el código y las columnas del módulo que toca (page, actions, `lib/<dominio>/`, SQL).
3. Cambio chico y local. Sin refactors de paso.
4. Reutilizá actions, clientes Supabase y clases `.g-*`.
5. Al terminar: decí qué cambió en 1–3 frases. No corras la app. El usuario prueba y pide ajustes.

---

## 12. Arranque de un chat nuevo (texto sugerido)

> Leé `.cursor/CONTEXTO-PROYECTO.md` y las rules de `.cursor/rules/`. Después [pedido].

Si el pedido choca con este resumen, **gana el código actual** (el repo puede haber avanzado). Actualizá este archivo solo si el usuario lo pide o si un cambio estructural lo deja mentiroso.
