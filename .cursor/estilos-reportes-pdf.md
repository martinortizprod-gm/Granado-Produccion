# Estilos de reportes PDF

Los PDF se arman a mano (PDF 1.4) y se publican con `publicarPdf` en `src/lib/informes/descarga.ts`. Fuentes: Helvetica (`F1`), Helvetica-Bold (`F2`), Helvetica-Oblique (`F3`), encoding WinAnsi. La fecha y el usuario salen de `datosEmision()` / `lineaEmision()` (`America/Argentina/Buenos_Aires`).

Hay dos familias. Un reporte para leer (cotización, receta, plan de dosificación, análisis de horas) usa la familia con marca. Un listado largo de filas usa la familia tabla.

## Familia con marca

Referencias: `src/lib/cotizaciones/pdf.ts`, `src/lib/recetas/informe.ts`, `src/lib/produccion/plan-pdf.ts`, `src/lib/planificacion/analisis-pdf.ts`.

- Hoja A4 vertical: 595 × 842 pt.
- Margen de contenido: x = 34, ancho 527.
- Banda superior de 40 pt, verde `#3D7A56`, de borde a borde.
  - «GRANADO» en negrita 13, crema `#F4F6F3`, en x = 34.
  - Filete vertical claro en x = 118.
  - Nombre del reporte en regular 11, crema.
  - Fecha y usuario en regular 8, crema, alineados a la derecha.
- Pie: filete `#60806E` en y = 812. A la izquierda, «Calidad en cada paso» en itálica 8, gris `#5C6B63`. Al centro, «Pág. N» si el reporte pagina. A la derecha, «GRANADO» en negrita 9, verde `#3D7A56`.
- El contenido arranca en y = 52. No pisar el pie: cortar antes de y = 792 y seguir en otra hoja con la misma banda y una línea de continuación en gris.
- Cajas con borde `#60806E` de 1,15 pt, sin relleno. Título de sección en negrita 11, texto `#1F2A24`.
- Etiqueta de campo en regular 7, gris `#5C6B63`. Valor en negrita 9–11, texto `#1F2A24`.
- Separador interno `#E6ECE7`.
- Tabla: cabeza `#DDE8DF`, texto negrita 7 gris. Filas alternas `#F4F6F3`. Total o destacado sobre verde suave `#E7F6EC`, texto verde `#2E5A40`. Fila final destacada (cotización) sobre verde `#3D7A56` con texto crema.
- Badge de estado activo: fondo `#E7F6EC`, borde verde, texto `#2E5A40`.
- Números con formato `es-AR`. Texto que no entra se corta con `...`.

### Gráficos

Los del análisis de horas (`src/lib/planificacion/analisis-pdf.ts`) usan la misma hoja y la misma banda. Los colores de las series son los del panel:

| Uso | Colores |
|-----|---------|
| Barras y tarjetas | `#3D7A56`, `#2F6FED`, `#F0A04B`, `#C4A35A` |
| Paradas no programadas (tarjeta) | `#C47B2B` |
| Roscas | `#2F6FED`, `#F0A04B`, `#3D7A56`, `#8AAB96`, `#3D6B8A`, `#B85C5C`, `#C47B2B` |
| Gantt | `#3D7A56`, `#2F6FED`, `#F0A04B`, `#8AAB96`, `#3D6B8A`, `#C47B2B`, `#B85C5C`, `#6B8F71` |
| Pista de la rosca y guías | `#DDE8DF`, `#E6ECE7` |
| Número sobre el bloque del Gantt | blanco |

La rosca arranca arriba y sigue en sentido horario. El bloque del Gantt lleva el número en blanco.

## Familia tabla

Referencias: `descargarPdf` en `src/lib/informes/descarga.ts` (informes operativos) y el PDF de `src/lib/respaldos/exportar.ts`.

- Hoja A4 horizontal: 842 × 595 pt. Margen 28.
- Título en negrita 12 y, debajo, la línea de emisión en 8. El texto va en negro, sin banda de color.
- Columnas de igual ancho. Texto 7 u 8. Encabezado en negrita.
- Pensada para listar muchas filas.
