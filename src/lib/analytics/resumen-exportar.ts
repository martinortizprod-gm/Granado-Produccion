import { fmtKg } from "@/lib/analytics/logic";
import {
  textoCantidad,
  textoStock,
  fmtHs,
  type FilaConsumoResumen,
  type ResumenMesVista,
} from "@/lib/analytics/resumen-operativo";
import { escaparPdf, publicarPdf } from "@/lib/informes/descarga";
import { datosEmision, lineaEmision } from "@/lib/informes/emision";
import { fechaVisible } from "@/lib/solicitudes/logic";

const ANCHO = 595;
const ALTO = 842;
const X0 = 34;
const CAJA = 527;
const TOPE = 792;
const VERDE = [61, 122, 86];
const TEXTO = [31, 42, 36];
const MUTED = [92, 107, 99];
const BORDE = [96, 128, 110];
const LINEA = [230, 236, 231];
const CREMA = [244, 246, 243];
const CABEZA = [221, 232, 223];

type Rgb = number[];
type Columna = { titulo: string; ancho: number; derecha: boolean };

function cmd(ops: number[], texto: string) {
  for (let i = 0; i < texto.length; i += 1) ops.push(texto.charCodeAt(i));
}

function rgb(ops: number[], color: Rgb, trazo = false) {
  cmd(ops, `${(color[0] / 255).toFixed(3)} ${(color[1] / 255).toFixed(3)} ${(color[2] / 255).toFixed(3)} ${trazo ? "RG" : "rg"}\n`);
}

function rect(ops: number[], x: number, yTop: number, w: number, h: number, relleno: Rgb | null) {
  if (!relleno) return;
  rgb(ops, relleno);
  cmd(ops, `${x.toFixed(1)} ${(ALTO - yTop - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f\n`);
}

function linea(ops: number[], x1: number, y1: number, x2: number, y2: number, color: Rgb, grosor = 0.4) {
  rgb(ops, color, true);
  cmd(ops, `${grosor} w\n${x1.toFixed(1)} ${(ALTO - y1).toFixed(1)} m ${x2.toFixed(1)} ${(ALTO - y2).toFixed(1)} l S\n`);
}

function textoPdf(ops: number[], x: number, yTop: number, size: number, valor: string, fuente: "F1" | "F2" | "F3", color: Rgb) {
  rgb(ops, color);
  cmd(ops, `BT /${fuente} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${(ALTO - yTop - size).toFixed(1)} Tm (`);
  ops.push(...escaparPdf(valor));
  cmd(ops, ") Tj ET\n");
}

function anchoTexto(valor: string, size: number) {
  return valor.length * size * 0.5;
}

function recortarAncho(valor: string, size: number, ancho: number) {
  const max = Math.max(4, Math.floor(ancho / (size * 0.48)));
  if (valor.length <= max) return valor;
  return `${valor.slice(0, max - 3)}...`;
}

function textoDerecha(ops: number[], x: number, w: number, yTop: number, size: number, valor: string, fuente: "F1" | "F2", color: Rgb) {
  textoPdf(ops, x + Math.max(4, w - anchoTexto(valor, size) - 4), yTop, size, valor, fuente, color);
}

function lineasDe(valor: string, size: number, ancho: number) {
  const palabras = valor.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidato = actual ? `${actual} ${palabra}` : palabra;
    if (anchoTexto(candidato, size) <= ancho) actual = candidato;
    else {
      if (actual) lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

function encabezado(ops: number[], cuando: string, usuario: string) {
  rect(ops, 0, 0, ANCHO, 40, VERDE);
  textoPdf(ops, X0, 14, 13, "GRANADO", "F2", CREMA);
  linea(ops, 118, 12, 118, 28, [200, 220, 208], 0.6);
  textoPdf(ops, 128, 15, 11, "Resumen de producción", "F1", CREMA);
  const usuarioCorto = recortarAncho(usuario, 8, 160);
  textoPdf(ops, ANCHO - 34 - anchoTexto(cuando, 8), 6, 8, cuando, "F1", CREMA);
  textoPdf(ops, ANCHO - 34 - anchoTexto(usuarioCorto, 8), 18, 8, usuarioCorto, "F1", CREMA);
}

function pie(ops: number[], pagina: number) {
  linea(ops, X0, 812, X0 + CAJA, 812, BORDE, 0.9);
  textoPdf(ops, X0, 822, 8, "Calidad en cada paso", "F3", MUTED);
  const pag = `Pág. ${pagina}`;
  textoPdf(ops, X0 + CAJA / 2 - anchoTexto(pag, 8) / 2, 822, 8, pag, "F1", MUTED);
  textoPdf(ops, X0 + CAJA - 62, 822, 9, "GRANADO", "F2", VERDE);
}

function celdasFila(ops: number[], y: number, columnas: Columna[], valores: string[], fuente: "F1" | "F2", color: Rgb, size: number) {
  let x = X0;
  columnas.forEach((columna, indice) => {
    const valor = recortarAncho(valores[indice] ?? "", size, columna.ancho - 8);
    if (columna.derecha) textoDerecha(ops, x, columna.ancho, y, size, valor, fuente, color);
    else textoPdf(ops, x + 4, y, size, valor, fuente, color);
    x += columna.ancho;
  });
}

export function descargarResumenMesPdf(resumen: ResumenMesVista) {
  const { cuando, usuario } = datosEmision();
  const paginas: number[][] = [];
  let ops: number[] = [];
  let y = 52;
  let pagina = 1;
  const continuar = `Resumen de producción  ·  ${resumen.etiqueta}`;

  const abrir = (continuacion: boolean) => {
    ops = [];
    encabezado(ops, cuando, usuario);
    y = 52;
    if (!continuacion) return;
    textoPdf(ops, X0, y, 8, recortarAncho(continuar, 8, CAJA), "F1", MUTED);
    y += 16;
  };
  const cerrar = () => {
    pie(ops, pagina);
    paginas.push(ops);
    pagina += 1;
  };
  const reservar = (alto: number) => {
    if (y + alto <= TOPE) return;
    cerrar();
    abrir(true);
  };

  const tabla = (titulo: string, columnas: Columna[], filas: string[][], vacio: string) => {
    reservar(18 + 16 + 16);
    textoPdf(ops, X0, y, 11, titulo, "F2", TEXTO);
    y += 16;
    const cabeza = () => {
      rect(ops, X0, y, CAJA, 16, CABEZA);
      celdasFila(ops, y + 4, columnas, columnas.map((columna) => columna.titulo), "F2", MUTED, 7);
      y += 16;
    };
    cabeza();
    if (!filas.length) {
      textoPdf(ops, X0 + 4, y + 3, 8, vacio, "F3", MUTED);
      y += 18;
      return;
    }
    filas.forEach((fila, indice) => {
      if (y + 16 > TOPE) {
        cerrar();
        abrir(true);
        cabeza();
      }
      if (indice % 2 === 1) rect(ops, X0, y, CAJA, 15, CREMA);
      celdasFila(ops, y + 3, columnas, fila, "F1", TEXTO, 8);
      linea(ops, X0, y + 15, X0 + CAJA, y + 15, LINEA, 0.4);
      y += 15;
    });
    y += 10;
  };

  abrir(false);
  textoPdf(ops, X0, y, 12, "RESUMEN PRODUCCIÓN + HS + INGREDIENTES", "F2", TEXTO);
  y += 16;
  textoPdf(
    ops,
    X0,
    y,
    8,
    recortarAncho(`${fechaVisible(resumen.desde)} – ${fechaVisible(resumen.hasta)}   ·   ${resumen.etiqueta}`, 8, CAJA),
    "F1",
    MUTED,
  );
  y += 16;

  tabla(
    "Horas",
    [
      { titulo: "Concepto", ancho: 427, derecha: false },
      { titulo: "Horas", ancho: 100, derecha: true },
    ],
    [
      [`Total horas disponibles ${resumen.etiqueta}`, fmtHs(resumen.disponibles)],
      [`Total horas finalizadas ${resumen.etiqueta}`, fmtHs(resumen.finalizadas)],
      [`Total horas productivas ${resumen.etiqueta}`, fmtHs(resumen.productivas)],
      [`Total horas paradas ${resumen.etiqueta}`, fmtHs(resumen.paradas)],
      [`Total horas pendientes ${resumen.etiqueta}`, fmtHs(resumen.pendientes)],
      [`Total horas pendientes planificadas ${resumen.etiqueta}`, fmtHs(resumen.planificadas)],
      [`Total horas pendientes sin planificar ${resumen.etiqueta}`, fmtHs(resumen.sinPlanificar)],
    ],
    "",
  );

  const nota = lineasDe(resumen.notaHoras, 7, CAJA);
  reservar(nota.length * 10 + 4);
  for (const lineaNota of nota) {
    textoPdf(ops, X0, y, 7, lineaNota, "F3", MUTED);
    y += 10;
  }
  y += 8;

  tabla(
    "PRODUCCIÓN POR TIPO DE ENVASE",
    [
      { titulo: "Envase", ancho: 327, derecha: false },
      { titulo: "Elaborado", ancho: 100, derecha: true },
      { titulo: "Pendiente", ancho: 100, derecha: true },
    ],
    resumen.envases.map((fila) => [fila.envase, fmtKg(fila.elaborado), fmtKg(fila.pendiente)]),
    "Sin producción elaborada ni pendiente en este mes.",
  );

  const grupos = resumen.consumos.filter((grupo) => grupo.filas.length > 0);
  if (!grupos.length) {
    reservar(28);
    textoPdf(ops, X0, y, 11, "RESUMEN DEL ESTADO DE LOS CONSUMOS", "F2", TEXTO);
    y += 16;
    textoPdf(ops, X0, y, 8, "No hay consumo pendiente en las solicitudes abiertas.", "F3", MUTED);
  } else {
    reservar(20);
    textoPdf(ops, X0, y, 11, "RESUMEN DEL ESTADO DE LOS CONSUMOS", "F2", TEXTO);
    y += 16;
    const columnas: Columna[] = [
      { titulo: "Artículo", ancho: 247, derecha: false },
      { titulo: "Pendiente", ancho: 70, derecha: true },
      { titulo: "Stock", ancho: 70, derecha: true },
      { titulo: "Faltante", ancho: 70, derecha: true },
      { titulo: "Sobrante", ancho: 70, derecha: true },
    ];
    for (const grupo of grupos) {
      tabla(
        grupo.titulo,
        columnas,
        grupo.filas.map((fila) => filaConsumo(fila)),
        "",
      );
    }
  }

  cerrar();
  publicarPdf(`resumen_produccion_${resumen.desde.slice(0, 7)}`, ANCHO, ALTO, paginas);
}

function filaConsumo(fila: FilaConsumoResumen) {
  return [fila.nombre, textoCantidad(fila), textoStock(fila, "stock"), textoStock(fila, "faltante"), textoStock(fila, "sobrante")];
}

function xml(valor: string) {
  return valor
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function celda(ref: string, estilo: number, valor: string | number | null, numero = false) {
  if (numero && typeof valor === "number" && Number.isFinite(valor)) {
    return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`;
  }
  const textoCelda = xml(valor == null ? "" : String(valor)).slice(0, 32767);
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${textoCelda}</t></is></c>`;
}

const CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[i] = c >>> 0;
  }
  return tabla;
})();

function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) c = CRC[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function u32(n: number) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function unir(partes: Uint8Array[]) {
  const total = partes.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    out.set(parte, offset);
    offset += parte.length;
  }
  return out;
}

function zipStore(archivos: { nombre: string; datos: Uint8Array }[]) {
  const encoder = new TextEncoder();
  const locales: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const archivo of archivos) {
    const nombreZip = encoder.encode(archivo.nombre);
    const crc = crc32(archivo.datos);
    const local = unir([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(archivo.datos.length),
      u32(archivo.datos.length),
      u16(nombreZip.length),
      u16(0),
      nombreZip,
      archivo.datos,
    ]);
    locales.push(local);
    central.push(
      unir([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(archivo.datos.length),
        u32(archivo.datos.length),
        u16(nombreZip.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nombreZip,
      ]),
    );
    offset += local.length;
  }
  const dir = unir(central);
  return unir([
    ...locales,
    dir,
    unir([u32(0x06054b50), u16(0), u16(0), u16(archivos.length), u16(archivos.length), u32(dir.length), u32(offset), u16(0)]),
  ]);
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2">
<numFmt numFmtId="164" formatCode="0.00"/>
<numFmt numFmtId="165" formatCode="0"/>
</numFmts>
<fonts count="5">
<font><sz val="11"/><color rgb="FF1F2A24"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><color rgb="FFF4F6F3"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><color rgb="FF5C6B63"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF2E5A40"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFF4F6F3"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF3D7A56"/><bgColor rgb="FF3D7A56"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE7F6EC"/><bgColor rgb="FFE7F6EC"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>
<left style="thin"><color rgb="FFD5E4D8"/></left>
<right style="thin"><color rgb="FFD5E4D8"/></right>
<top style="thin"><color rgb="FFD5E4D8"/></top>
<bottom style="thin"><color rgb="FFD5E4D8"/></bottom>
<diagonal/>
</border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="164" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
</cellXfs>
</styleSheet>`;

function hojaResumen(resumen: ResumenMesVista) {
  const filas: string[] = [];
  const merges: string[] = [];
  let r = 1;

  const poner = (celdas: string, alto?: number, desde = "", hasta = "") => {
    const ht = alto ? ` ht="${alto}" customHeight="1"` : "";
    filas.push(`<row r="${r}"${ht}>${celdas}</row>`);
    if (desde && hasta) merges.push(`${desde}${r}:${hasta}${r}`);
    r += 1;
  };
  const blanco = () => {
    r += 1;
  };
  const seccion = (titulo: string) => {
    poner(celda(`A${r}`, 3, titulo), 20, "A", "E");
  };
  const cabezaTabla = (titulos: string[]) => {
    poner(titulos.map((titulo, i) => celda(`${"ABCDE"[i]}${r}`, 5, titulo)).join(""), 20);
  };

  poner(celda(`A${r}`, 1, "GRANADO  ·  Resumen producción + HS + ingredientes"), 28, "A", "E");
  poner(celda(`A${r}`, 2, lineaEmision()), 18, "A", "E");
  blanco();
  poner(`${celda(`A${r}`, 3, "Período")}${celda(`B${r}`, 4, `${fechaVisible(resumen.desde)} – ${fechaVisible(resumen.hasta)}`)}`, undefined, "B", "E");
  poner(`${celda(`A${r}`, 3, "Mes")}${celda(`B${r}`, 4, resumen.etiqueta)}`, undefined, "B", "E");
  blanco();

  seccion("Horas");
  cabezaTabla(["Concepto", "Horas"]);
  const horas: [string, number][] = [
    [`Total horas disponibles ${resumen.etiqueta}`, resumen.disponibles],
    [`Total horas finalizadas ${resumen.etiqueta}`, resumen.finalizadas],
    [`Total horas productivas ${resumen.etiqueta}`, resumen.productivas],
    [`Total horas paradas ${resumen.etiqueta}`, resumen.paradas],
    [`Total horas pendientes ${resumen.etiqueta}`, resumen.pendientes],
    [`Total horas pendientes planificadas ${resumen.etiqueta}`, resumen.planificadas],
    [`Total horas pendientes sin planificar ${resumen.etiqueta}`, resumen.sinPlanificar],
  ];
  for (const [concepto, valor] of horas) {
    poner(`${celda(`A${r}`, 6, concepto)}${celda(`B${r}`, 7, valor, true)}`);
  }
  const altoNota = Math.min(48, 18 + Math.ceil(resumen.notaHoras.length / 90) * 14);
  poner(celda(`A${r}`, 2, resumen.notaHoras), altoNota, "A", "E");
  blanco();

  seccion("Producción por tipo de envase");
  cabezaTabla(["Envase", "Elaborado (kg)", "Pendiente (kg)"]);
  if (!resumen.envases.length) {
    poner(celda(`A${r}`, 4, "Sin producción elaborada ni pendiente en este mes."), undefined, "A", "E");
  } else {
    for (const fila of resumen.envases) {
      poner(`${celda(`A${r}`, 6, fila.envase)}${celda(`B${r}`, 7, fila.elaborado, true)}${celda(`C${r}`, 7, fila.pendiente, true)}`);
    }
  }
  blanco();

  seccion("Resumen del estado de los consumos");
  const grupos = resumen.consumos.filter((grupo) => grupo.filas.length > 0);
  if (!grupos.length) {
    poner(celda(`A${r}`, 4, "No hay consumo pendiente en las solicitudes abiertas."), undefined, "A", "E");
  } else {
    for (const grupo of grupos) {
      const unidad = grupo.filas[0]?.unidad === "kg" ? "kg" : "un.";
      seccion(grupo.titulo);
      cabezaTabla(["Artículo", `Pendiente (${unidad})`, `Stock (${unidad})`, `Faltante (${unidad})`, `Sobrante (${unidad})`]);
      for (const fila of grupo.filas) {
        poner(
          [
            celda(`A${r}`, 6, fila.nombre),
            celda(`B${r}`, 7, fila.pendiente, true),
            celda(`C${r}`, 7, fila.stock, true),
            celda(`D${r}`, 7, fila.faltante, true),
            celda(`E${r}`, 7, fila.sobrante, true),
          ].join(""),
        );
      }
    }
  }

  const ultima = Math.max(1, r - 1);
  const cols = [52, 20, 18, 16, 16].map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:E${ultima}"/>
<sheetViews>
<sheetView showGridLines="0" tabSelected="1" workbookViewId="0">
<pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/>
<selection pane="bottomLeft" activeCell="A3" sqref="A3"/>
</sheetView>
</sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${cols}</cols>
<sheetData>${filas.join("")}</sheetData>
<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0" paperSize="9"/>
<headerFooter>
<oddFooter>&amp;LCalidad en cada paso&amp;CPág. &amp;P&amp;RGRANADO</oddFooter>
</headerFooter>
</worksheet>`;
}

function armarXlsx(resumen: ResumenMesVista) {
  const encoder = new TextEncoder();
  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  return zipStore([
    { nombre: "[Content_Types].xml", datos: encoder.encode(tipos) },
    { nombre: "_rels/.rels", datos: encoder.encode(rels) },
    { nombre: "xl/workbook.xml", datos: encoder.encode(workbook) },
    { nombre: "xl/_rels/workbook.xml.rels", datos: encoder.encode(workbookRels) },
    { nombre: "xl/styles.xml", datos: encoder.encode(ESTILOS) },
    { nombre: "xl/worksheets/sheet1.xml", datos: encoder.encode(hojaResumen(resumen)) },
  ]);
}

export function descargarResumenMesExcel(resumen: ResumenMesVista) {
  const bytes = armarXlsx(resumen);
  const copia = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copia).set(bytes);
  const url = URL.createObjectURL(
    new Blob([copia], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `resumen_produccion_${resumen.desde.slice(0, 7)}.xlsx`;
  enlace.click();
  URL.revokeObjectURL(url);
}
