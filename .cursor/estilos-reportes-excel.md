# Estilos de reportes Excel

Hay tres salidas. Un reporte para leer usa el xlsx con marca. Una grilla operativa usa el `.xls` simple. La cotización de productos usa una tabla de Excel, sin la banda verde.

La fecha y el usuario, cuando el archivo los muestra, salen de `lineaEmision()` (`America/Argentina/Buenos_Aires`).

## xlsx con marca

Referencia: `descargarDetalleRecetaExcel` en `src/lib/recetas/informe.ts`. Es el modelo para un reporte nuevo con membrete.

- Archivo `.xlsx` real (Office Open XML), fuente Calibri.
- Sin líneas de cuadrícula. Encabezado de la tabla congelado. Ajuste a una página de ancho, A4 vertical.
- Márgenes: izquierda y derecha 0,5; arriba y abajo 0,6.
- Pie de página: izquierda «Calidad en cada paso», centro «Pág. N», derecha «GRANADO».

Colores:

| Uso | Color |
|-----|--------|
| Texto | `#1F2A24` |
| Verde Granado (banda y cabeza de tabla) | `#3D7A56` |
| Texto sobre verde | `#F4F6F3` |
| Verde de títulos y total | `#2E5A40` |
| Texto secundario | `#5C6B63` |
| Fondo de etiqueta y de total | `#E7F6EC` |
| Borde de celda | `#D5E4D8` |

Estilos de celda, en el orden del archivo:

1. Banda: negrita 16, crema sobre verde, alto de fila 28. El título es «GRANADO  ·  » más el nombre del reporte, y ocupa todo el ancho.
2. Emisión: itálica 10, gris, alto 18.
3. Etiqueta de un dato: negrita 11, verde `#2E5A40`, fondo verde suave.
4. Valor del dato: regular 11, texto.
5. Cabeza de tabla: negrita 11, crema sobre verde, borde fino, centrada, alto 20.
6. Texto de fila: regular, borde fino, alineado a la izquierda.
7. Número decimal: formato `0.00`, alineado a la derecha, borde fino.
8. Entero: formato `0`, centrado, borde fino.
9. Total, texto: negrita verde sobre verde suave, borde fino.
10. Total, número: igual que el total, formato `0.00`, a la derecha.

## xlsx de cotización de productos

Referencia: `src/lib/cotizaciones/excel.ts`.

- `.xlsx` con una tabla (`TableStyleMedium9`), filtro y filas alternas.
- Calibri 11, sin colores propios de Granado.
- Enteros centrados con formato `#,##0`. Importes con formato de moneda `$` y dos decimales.

## .xls simple

Referencia: `descargarExcel` en `src/lib/informes/descarga.ts`. Lo usan Informes, el resumen de horas, el Excel numérico del análisis de horas, Producción y Movimientos.

- SpreadsheetML (`.xls`), en Calibri implícito del programa, sin colores ni pie.
- La primera fila es el encabezado, en texto. Los números van como número; el resto, como texto.
- Pensada para llevarse la grilla tal como se ve en pantalla.
