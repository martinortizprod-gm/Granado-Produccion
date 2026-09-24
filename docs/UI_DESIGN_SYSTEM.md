# Sistema de diseño UI — Granado Web

Fuente de verdad visual para la app Next.js.

Referencias conceptuales: mockups de Login, Solicitudes y Usuarios.
Logo oficial: ícono de fábrica (`public/brand/granado-icon.png`, origen `docs/img/img-inicio.png`).
**No usar** el logo de hoja de los mockups.

**Resolución desktop objetivo:** ~1366×768. Priorizar densidad operativa + legibilidad.

---

## Tokens (CSS)

Definidos en `src/app/globals.css` (`:root` y `html.oscuro`).

### Colores (jerarquía verde)

| Token | Uso |
|-------|-----|
| `--color-sidebar` | Fondo sidebar |
| `--color-primary` / `-hover` | Acciones y branding |
| `--color-sidebar-active` / `-hover` | Ítem activo / hover menú |
| `--color-primary-muted` | Acentos secundarios, focus |
| `--color-primary-light` / `-soft` | Fondos suaves, fila activa/hover |
| `--color-success` (+ `-bg`) | Completado / OK |
| `--color-background` | Fondo página (`#F4F7F5`) |
| `--color-surface` / `-secondary` | Cards / headers de tabla |
| `--color-border` | Bordes sutiles |
| `--color-text` / `-secondary` / `-muted` | Tipografía |
| `--color-warning` / `-danger` / `-info` | Estados |

No inventar verdes nuevos: reutilizar estos tokens.

### Escala de espaciado

`8 / 12 / 16 / 24 / 32` → `--spacing-xs` … `--spacing-xl`

Layout:

- `--sidebar-width`: ~14.75rem
- `--header-height`: 3rem (compacto)
- `--control-height`: 36px (inputs, selects, botones)
- `--page-pad-x` / `--page-pad-y`: padding de `main`
- `--section-gap`: 12px entre bloques (`.g-stack`)
- `--transition`: 150ms

### Radios y sombras

- `--radius-sm` 6 · `--radius-md` 8 · `--radius-lg` 10
- Sombras casi imperceptibles (`--shadow-sm`)

---

## Tipografía

| Rol | Token / clase | Tamaño aprox. |
|-----|---------------|---------------|
| Page title | `.g-page-title` | 1.25rem |
| Section / card title | `.g-section-title` | 0.9375rem |
| Body / table | `--text-body` / `--text-table` | 0.8125rem |
| Label | `.g-label` | 0.75rem |
| Caption / thead | `--text-caption` | 0.6875rem |

---

## Clases utilitarias

- `.g-card` · `.g-input` · `.g-label`
- `.g-btn` + `-primary` | `-secondary` | `-danger` | `-ghost` | `-sm`
- `.g-badge` + `-success` | `-warning` | `-danger` | `-info` | `-neutral`
- `.g-table-wrap` + `.g-table-toolbar` + `.g-table-scroll` (+ `-ops`) + `.g-table` + `.g-row-active`
- `.g-page-title` / `.g-page-subtitle` / `.g-section-title`
- `.g-kpi` / `.g-kpi-title` / `.g-kpi-value`
- `.g-alert` · `.g-stack` · `.g-truncate`

---

## Densidad y pantallas operativas

- Sistema de trabajo: información + claridad, no landing.
- Evitar cards/botones/paddings grandes.
- En Solicitudes deben convivir KPIs + filtros + tabla + detalle sin scroll solo por padding.
- KPIs compactos: número dominante, label secundario, poca altura.
- Controles de filtro: misma altura (`--control-height`).
- Búsqueda y filtros: clase `.g-filters`. En PC (≥1024px) van siempre en una fila, uno al lado del otro. En tablet y móvil, uno debajo del otro. El selector de columnas queda fuera de esa fila.

## Tablas

- Contenedor: `.g-table-wrap` (flex column, overflow hidden).
- Toolbar opcional: `.g-table-toolbar` (queda fija; no entra al scroll).
- Cuerpo con scroll: `.g-table-scroll` (horizontal + vertical). En pantallas operativas con KPIs/filtros usar también `.g-table-scroll-ops`.
- Header sticky: `thead th` con `position: sticky; top: 0` y fondo opaco. Las columnas siguen visibles al bajar 100+ filas.
- Header `--color-table-header` (verde-gris un poco más oscuro que la superficie), tipografía caption uppercase.
- Divisores verticales suaves entre columnas (`border-left` en celdas).
- Filas densas (~padding vertical bajo).
- Hover: `--color-primary-soft`.
- Selección (`.g-row-active`): fondo `--color-primary-light` + barra izquierda inset `--color-primary-muted`.
- Textos largos: `.g-truncate` + atributo `title`.
- Números: `tabular-nums`.
- Badges uniformes (misma altura/padding).

## KPIs

`.g-kpi`: padding reducido; valor ~1.35rem; title caption uppercase.

## Badges

Misma altura (~1.35rem), padding y peso. Variantes:

- Completada / Admin → success
- En producción → warning
- Operario → info
- Error → danger
- Otros → neutral

## Sidebar / Header

- Sidebar: concepto visual actual; compactar espaciado; iconos 16px; footer con aire inferior.
- Toggle mostrar/ocultar en el header (hamburguesa). En desktop persiste en `localStorage` (`granado-sidebar`). En mobile abre overlay temporal.
- Header: compacto (~48px); no competir con el contenido.

## Tablas de registros

- Selector de columnas: `ColumnPicker` + `useColumnVisibility(tableId, cols)` en `components/ui/`.
- La columna Acciones queda fija (`locked`).
- Preferencia de columnas en `localStorage` (`granado-cols:<tabla>`).
- Detalle completo: ícono ojo (`RowDetailButton`) abre `RecordDetailDrawer`. No inventar campos: solo los del registro.

## Paneles temporales

- Detalle de Solicitudes: no ocupa columna permanente. Se abre al cliquear una fila (`.g-drawer-detail`) y se cierra con X o el fondo. No inventar un panel fijo en pantallas operativas nuevas salvo necesidad.

## Login

Mantener layout partido. Refinar jerarquía y tamaño de card (~380px). Nota Supabase con poco protagonismo.

---

## Componentes

| Pieza | Ubicación |
|-------|-----------|
| Shell | `components/app-shell.tsx` |
| Brand | `components/ui/brand.tsx` |
| Iconos | `components/ui/icons.tsx` |
| Tema / Logout | `theme-toggle.tsx` / `logout-button.tsx` |
| Nav | `lib/modulos.ts` |

---

## Reglas para nuevas pantallas

1. Reutilizar tokens y clases `.g-*`.
2. Envolver con `AppShell`.
3. Densidad pensada para 1366×768.
4. Tablas operativas: `.g-table` + selección/hover estándar.
5. No hardcodear verdes; no inventar KPIs ni flujos por mockups.
6. No tocar Auth / Supabase / SQL / lógica por un cambio visual.
7. Logo = fábrica `/brand/granado-icon.png`.
8. Espaciado de sección: preferir `.g-stack` / `--section-gap`.

Cualquier pantalla futura debe sentirse parte del mismo sistema.
