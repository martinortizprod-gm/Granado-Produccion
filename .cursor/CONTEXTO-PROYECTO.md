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
| `src/components/app-shell.tsx` | Sidebar, header, filtro de menú por permiso |

---

## 7. Auth, usuarios y permisos

**Login:** correo y contraseña de **Supabase Auth** (`signInWithPassword`). No es la clave del desktop.

**Callback:** `src/app/auth/callback/route.ts` (`exchangeCodeForSession`). Configurar redirect `/auth/callback` en Supabase (local y Vercel).

**Logout:** `src/app/logout/actions.ts` → `/login`.

**Perfil (`getPerfilSesion`):**

1. Email de Auth.
2. Fila en `usuarios` por `mail` (sin importar mayúsculas).
3. Si falta `auth_user_id`, lo vincula al UUID de Auth.
4. Rol: `id_rol` → tabla `roles`. Fallback: `usuarios.rol = 'admin'`.
5. Permisos: filas de `rol_permisos` para ese rol.
6. Si es Administrador, todos los permisos quedan en `true`.

**Tablas de permisos** (`supabase/roles_y_permisos.sql`):

- `roles`: `id`, `nombre`, `descripcion`, `es_sistema`, `fecha_registro`
- `rol_permisos`: `id_rol`, `modulo`, `puede_ver`, `puede_leer`, `puede_editar` (único `id_rol + modulo`)
- `usuarios` también tiene `id_rol`, `auth_user_id` y el texto legacy `rol` (`admin` / `operario`)

**Acciones:** `ver` | `leer` | `editar` (`puede()`):

- Admin → siempre sí
- `ver` → ver **o** leer **o** editar
- `leer` → leer **o** editar
- `editar` → solo editar

**Roles seed:** Administrador (sistema, todo) y Operario (ver/leer catálogos + inicio + productos).

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

Definidos en `src/lib/modulos.ts`. Grupos del menú (solo visual): Operación, Maestros, Análisis, Sistema.

| Módulo | Ruta | Qué hace |
|--------|------|----------|
| Inicio | `/` | Dashboard: KPIs, actividad, accesos según permiso. |
| Solicitudes | `/solicitudes` | Pedidos de producción. Alta `/solicitudes/nueva`, edición `/solicitudes/[id]/editar`. |
| Producción | `/produccion` | Jornada por solicitud/lote: pallets, horas, paradas, consumos, barridos, responsables, cierre de stock. |
| Movimientos | `/movimientos` | Ingresos/egresos de ingredientes, insumos, envases, etiquetas, productos. |
| Planificación | `/planificacion` | Plan mensual (`planificacion_*`): generar/recalcular mes, rendimientos, horarios, paradas. Query `?mes=&ops=`. |
| Informes | `/informes` | **Placeholder** (“en construcción”). Los permisos sí aplican. Hay exportaciones .xlsx en otros módulos. |
| Ingredientes / Insumos / Envases / Etiquetas | `/ingredientes` etc. | Misma plantilla `src/app/catalogo/`. CRUD del catálogo + stock. |
| Productos | `/productos` | Productos terminados, stock (movimientos + cierres), vínculo envase/etiqueta. |
| Recetas | `/recetas` | Versiones (`registro_versiones`) y líneas (`recetas`) por producto. |
| Data Analytics | `/analytics` | Tabs: producción, stock, trazabilidad, reportes. |
| Usuarios | `/usuarios` | Roles, permisos, altas. Crea user en Auth + fila `usuarios`. Service role. |
| Respaldos | `/respaldos` | Export xlsx / pdf / sql / json (`POST /api/respaldos`). |

Casi todas las pages son Server Components con `dynamic = "force-dynamic"` y un `*-client.tsx`.

**Server actions** (en `src/app/<modulo>/actions.ts`):

- solicitudes: `crearSolicitud`, `actualizarSolicitud`, `eliminarSolicitud`, `solicitudTieneProduccion`
- catalogo: `guardarCatalogo`, `eliminarCatalogo`
- productos: `guardarProducto`, `eliminarProducto`
- recetas: `guardarVersion`, `eliminarVersion`, `guardarLinea`, `eliminarLinea`
- movimientos: `guardarMovimiento`, `eliminarMovimiento`
- planificacion: `generarMes`, `recalcularMes`, `guardarDia`, `alternarContempla`, `asignarCategoria`, `eliminarDia`, `guardarRendimientos`, `guardarCapacidades`, `guardarHorarios`, `guardarParadas`
- produccion: `registrarJornada`, `eliminarJornada`, `guardarPrevios`, `agregarCatalogoPrevio`
- usuarios: `listarRoles`, `listarPermisosRol`, `guardarRol`, `eliminarRol`, `listarUsuariosApp`, `crearUsuarioApp`, `actualizarUsuarioApp`

Antes de inventar una action, buscar si ya existe.

---

## 9. Datos (tablas reales)

Esquema: `supabase/schema_inicial.sql` (33 tablas de negocio). Roles: `supabase/roles_y_permisos.sql` (+ `roles`, `rol_permisos`).

**No migrar** `tablas_detalle` (basura de Excel).

**Catálogos:** `catalogo_articulos`, `catalogo_envases`, `catalogo_equipos`, `catalogo_etiquetas`, `catalogo_ingredientes`, `catalogo_insumos`, `catalogo_productos`

**Operación:** `solicitudes`, `produccion`, `consumo`, `barridos_linea`, `limpieza_equipos`, `responsables_producciones`, `paradas_programadas`, `paradas_no_programadas`, `causas_paradas`

**Recetas:** `registro_versiones`, `recetas`

**Stock:** `movimientos_ingredientes`, `movimientos_insumos`, `movimientos_envases`, `movimientos_etiquetas`, `movimientos_productos`

**Planificación:** `planificacion_mensual`, `planificacion_capacidades`, `planificacion_horarios`, `planificacion_paradas`, `planificacion_rendimientos`

**Otros:** `usuarios`, `_meta_tablas`

**SQL extra:**

- `supabase/fix_tipos_texto.sql` — tipos text en columnas que lo necesitaron
- `supabase/politica_lectura_anon_dev.sql` — lectura anon temporal de catálogos (solo dev)

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
- Login: layout partido, card chica. Sin AppShell.
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
