import { escaparPdf, publicarPdf } from "@/lib/informes/descarga";
import { datosEmision, lineaEmision } from "@/lib/informes/emision";
import { ESTADO_ACTIVO, pctTexto, type VersionVista } from "@/lib/recetas/logic";
import { aFecha, fechaVisible } from "@/lib/solicitudes/logic";

const ANCHO = 595;
const ALTO = 842;
const X0 = 34;
const CAJA = 527;
const VERDE = [61, 122, 86];
const VERDE_TIT = [46, 90, 64];
const TEXTO = [31, 42, 36];
const MUTED = [92, 107, 99];
const BORDE = [96, 128, 110];
const VERDE_SUAVE = [231, 246, 236];
const CAB_TABLA = [221, 232, 223];
const FILA_ALT = [244, 246, 243];
const BLANCO = [244, 246, 243];

type Rgb = number[];

const ANCHOS = [78, 214, 70, 60, 105];
const TITULOS = ["Código", "Ingrediente", "Tipo", "Puesto", "Participación"];

export function nombreInformeReceta(version: VersionVista) {
  const quien = version.codigo_producto || version.producto || `id ${version.id}`;
  const ver = version.numero ? ` v${version.numero}` : "";
  return `Receta ${quien}${ver}`.replace(/[<>:"/\\|?*]/g, " ").replace(/\s+/g, " ").trim();
}

function cmd(ops: number[], texto: string) {
  for (let i = 0; i < texto.length; i += 1) ops.push(texto.charCodeAt(i));
}

function rgb(ops: number[], color: Rgb, trazo = false) {
  cmd(
    ops,
    `${(color[0] / 255).toFixed(3)} ${(color[1] / 255).toFixed(3)} ${(color[2] / 255).toFixed(3)} ${trazo ? "RG" : "rg"}\n`,
  );
}

function rect(
  ops: number[],
  x: number,
  yTop: number,
  w: number,
  h: number,
  relleno: Rgb | null,
  borde: Rgb | null,
) {
  const y = ALTO - yTop - h;
  if (relleno) rgb(ops, relleno);
  if (borde) {
    rgb(ops, borde, true);
    cmd(ops, "1.15 w\n");
  }
  cmd(
    ops,
    `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re ${relleno && borde ? "B" : relleno ? "f" : "S"}\n`,
  );
}

function linea(ops: number[], x1: number, y1: number, x2: number, y2: number, color: Rgb, grosor = 0.4) {
  rgb(ops, color, true);
  cmd(
    ops,
    `${grosor} w\n${x1.toFixed(1)} ${(ALTO - y1).toFixed(1)} m ${x2.toFixed(1)} ${(ALTO - y2).toFixed(1)} l S\n`,
  );
}

function texto(
  ops: number[],
  x: number,
  yTop: number,
  size: number,
  valor: string,
  fuente: "F1" | "F2" | "F3",
  color: Rgb,
) {
  rgb(ops, color);
  const y = ALTO - yTop - size;
  cmd(ops, `BT /${fuente} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (`);
  ops.push(...escaparPdf(valor));
  cmd(ops, ") Tj ET\n");
}

function recortarAncho(valor: string, size: number, ancho: number) {
  const max = Math.max(4, Math.floor(ancho / (size * 0.48)));
  if (valor.length <= max) return valor;
  return `${valor.slice(0, max - 3)}...`;
}

function textoDerecha(
  ops: number[],
  x: number,
  w: number,
  y: number,
  size: number,
  valor: string,
  fuente: "F1" | "F2",
  color: Rgb,
) {
  const ancho = valor.length * size * 0.5;
  texto(ops, x + w - 6 - ancho, y, size, valor, fuente, color);
}

function textoCentro(
  ops: number[],
  x: number,
  w: number,
  y: number,
  size: number,
  valor: string,
  fuente: "F1" | "F2",
  color: Rgb,
) {
  const ancho = valor.length * size * 0.48;
  texto(ops, x + Math.max(4, (w - ancho) / 2), y, size, valor, fuente, color);
}

function encabezadoPdf(ops: number[], cuando: string, usuario: string) {
  rect(ops, 0, 0, ANCHO, 40, VERDE, null);
  texto(ops, X0, 14, 13, "GRANADO", "F2", BLANCO);
  linea(ops, 118, 12, 118, 28, [200, 220, 208], 0.6);
  texto(ops, 128, 15, 11, "Detalle de receta", "F1", BLANCO);
  const usuarioCorto = recortarAncho(usuario, 8, 160);
  texto(ops, ANCHO - 34 - cuando.length * 4.1, 6, 8, cuando, "F1", BLANCO);
  texto(ops, ANCHO - 34 - usuarioCorto.length * 4.1, 18, 8, usuarioCorto, "F1", BLANCO);
}

function piePdf(ops: number[], pagina: number) {
  linea(ops, X0, 812, X0 + CAJA, 812, BORDE, 0.9);
  texto(ops, X0, 822, 8, "Calidad en cada paso", "F3", MUTED);
  const pag = `Pág. ${pagina}`;
  texto(ops, X0 + CAJA / 2 - pag.length * 2, 822, 8, pag, "F1", MUTED);
  texto(ops, X0 + CAJA - 62, 822, 9, "GRANADO", "F2", VERDE);
}

export function descargarDetalleRecetaPdf(nombre: string, version: VersionVista) {
  const { cuando, usuario } = datosEmision();
  const paginas: number[][] = [];
  let ops: number[] = [];
  let y = 52;
  let yTabla = y;
  let pagina = 1;

  const dato = (dx: number, dy: number, w: number, etiqueta: string, valor: string, tam = 10) => {
    texto(ops, dx, dy, 7, etiqueta, "F1", MUTED);
    texto(ops, dx, dy + 10, tam, recortarAncho(valor || "—", tam, w), "F2", TEXTO);
  };

  encabezadoPdf(ops, cuando, usuario);

  const yInfo = y;
  texto(ops, X0 + 10, y + 8, 11, "Versión", "F2", TEXTO);
  const estado = version.estado_etiqueta || "—";
  const activo = version.estado === ESTADO_ACTIVO;
  const wBadge = Math.min(120, Math.max(64, estado.length * 4.6 + 16));
  const xBadge = X0 + CAJA - 10 - wBadge;
  rect(ops, xBadge, y + 6, wBadge, 16, activo ? VERDE_SUAVE : [236, 238, 236], activo ? VERDE : [176, 184, 178]);
  const anchoEstado = estado.length * 4.15;
  texto(ops, xBadge + (wBadge - anchoEstado) / 2, y + 10, 8, estado, "F2", activo ? VERDE_TIT : MUTED);
  y += 28;
  dato(X0 + 10, y, 130, "Código", version.codigo_producto || "Pendiente");
  dato(X0 + 150, y, 360, "Producto", version.producto || "—");
  y += 28;
  linea(ops, X0 + 10, y, X0 + CAJA - 10, y, [230, 236, 231], 0.4);
  y += 8;
  dato(X0 + 10, y, 90, "Versión", version.numero ? String(version.numero) : "—");
  dato(X0 + 120, y, 140, "Fecha de registro", fechaVisible(aFecha(version.fecha_registro)));
  dato(X0 + 280, y, 100, "Líneas", String(version.lineas.length));
  dato(X0 + 390, y, 120, "Id", String(version.id));
  y += 28;
  linea(ops, X0 + 10, y, X0 + CAJA - 10, y, [230, 236, 231], 0.4);
  y += 8;
  dato(
    X0 + 10,
    y,
    200,
    "Participación total",
    version.lineas.length === 0 ? "—" : pctTexto(version.participacion_total),
  );
  y += 28;
  rect(ops, X0, yInfo, CAJA, y - yInfo, null, BORDE);

  y += 14;

  const pintarCabeza = () => {
    let xx = X0;
    rect(ops, X0, y, CAJA, 16, CAB_TABLA, null);
    TITULOS.forEach((titulo, i) => {
      texto(ops, xx + 4, y + 4, 7, titulo, "F2", MUTED);
      xx += ANCHOS[i];
    });
    y += 16;
  };

  const abrirTabla = (continuacion: boolean) => {
    yTabla = y;
    texto(ops, X0 + 10, y + 6, 11, continuacion ? "Fórmula (continuación)" : "Fórmula", "F2", TEXTO);
    y += 22;
    pintarCabeza();
  };

  const cerrarTabla = () => {
    rect(ops, X0, yTabla, CAJA, y - yTabla, null, BORDE);
  };

  const salto = () => {
    cerrarTabla();
    piePdf(ops, pagina);
    paginas.push(ops);
    pagina += 1;
    ops = [];
    encabezadoPdf(ops, cuando, usuario);
    y = 52;
    const cinta = recortarAncho(
      `${version.codigo_producto || "Pendiente"}   ·   ${version.producto || "—"}   ·   v${version.numero || "—"}`,
      8,
      CAJA,
    );
    texto(ops, X0, y, 8, cinta, "F1", MUTED);
    y += 16;
    abrirTabla(true);
  };

  abrirTabla(false);

  if (version.lineas.length === 0) {
    texto(ops, X0 + 10, y + 6, 9, "Esta versión todavía no tiene ingredientes en la fórmula.", "F3", MUTED);
    y += 22;
  } else {
    version.lineas.forEach((lineaItem, indice) => {
      if (y + 15 > 786) salto();
      if (indice % 2 === 1) rect(ops, X0, y, CAJA, 15, FILA_ALT, null);
      const celdas = [
        lineaItem.codigo_ingrediente || "—",
        lineaItem.ingrediente || "—",
        lineaItem.tipo_etiqueta || "—",
        lineaItem.puesto ? String(lineaItem.puesto) : "—",
        pctTexto(lineaItem.participacion_pct),
      ];
      let cx = X0;
      celdas.forEach((valor, i) => {
        const tam = 8;
        const mostrado = recortarAncho(valor, tam, ANCHOS[i] - 8);
        if (i === 4) textoDerecha(ops, cx, ANCHOS[i], y + 4, tam, mostrado, "F1", TEXTO);
        else if (i === 3) textoCentro(ops, cx, ANCHOS[i], y + 4, tam, mostrado, "F1", TEXTO);
        else texto(ops, cx + 4, y + 4, tam, mostrado, "F1", TEXTO);
        cx += ANCHOS[i];
      });
      y += 15;
    });
    if (y + 18 > 786) salto();
    const total = pctTexto(version.participacion_total);
    rect(ops, X0, y, CAJA, 18, VERDE_SUAVE, null);
    texto(ops, X0 + 8, y + 5, 8, "Participación total", "F2", VERDE_TIT);
    textoDerecha(ops, X0 + CAJA - ANCHOS[4], ANCHOS[4], y + 5, 8, total, "F2", VERDE_TIT);
    y += 18;
  }

  cerrarTabla();
  piePdf(ops, pagina);
  paginas.push(ops);
  publicarPdf(nombre, ANCHO, ALTO, paginas);
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
    unir([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(archivos.length),
      u16(archivos.length),
      u32(dir.length),
      u32(offset),
      u16(0),
    ]),
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
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
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

function hojaReceta(version: VersionVista) {
  const filas: string[] = [];
  const merges: string[] = [];
  let r = 1;

  const fila = (n: number, celdas: string, alto?: number) => {
    const ht = alto ? ` ht="${alto}" customHeight="1"` : "";
    filas.push(`<row r="${n}"${ht}>${celdas}</row>`);
  };
  const par = (etiqueta: string, valor: string) => {
    fila(r, `${celda(`A${r}`, 3, etiqueta)}${celda(`B${r}`, 4, valor)}`);
    merges.push(`B${r}:E${r}`);
    r += 1;
  };

  fila(r, celda(`A${r}`, 1, "GRANADO  ·  Detalle de receta"), 28);
  merges.push(`A${r}:E${r}`);
  r += 1;
  fila(r, celda(`A${r}`, 2, lineaEmision()), 18);
  merges.push(`A${r}:E${r}`);
  r += 2;

  par("Producto", version.producto || "—");
  par("Código", version.codigo_producto || "Pendiente");
  par("Versión", version.numero ? String(version.numero) : "—");
  par("Estado", version.estado_etiqueta || "—");
  par("Fecha de registro", fechaVisible(aFecha(version.fecha_registro)));
  par("Líneas", String(version.lineas.length));
  par("Participación total", version.lineas.length === 0 ? "—" : pctTexto(version.participacion_total));
  par("Id", String(version.id));
  r += 1;

  const cabeza = r;
  fila(
    r,
    ["Código", "Ingrediente", "Tipo", "Puesto", "Participación %"]
      .map((titulo, i) => celda(`${"ABCDE"[i]}${r}`, 5, titulo))
      .join(""),
    20,
  );
  r += 1;

  let finDatos = cabeza;
  if (version.lineas.length === 0) {
    fila(r, celda(`A${r}`, 4, "Esta versión todavía no tiene ingredientes en la fórmula."));
    merges.push(`A${r}:E${r}`);
    r += 1;
  } else {
    for (const lineaItem of version.lineas) {
      const puesto = lineaItem.puesto ? String(lineaItem.puesto) : "—";
      fila(
        r,
        [
          celda(`A${r}`, 6, lineaItem.codigo_ingrediente || "—"),
          celda(`B${r}`, 6, lineaItem.ingrediente || "—"),
          celda(`C${r}`, 6, lineaItem.tipo_etiqueta || "—"),
          lineaItem.puesto
            ? celda(`D${r}`, 8, lineaItem.puesto, true)
            : celda(`D${r}`, 6, puesto),
          celda(`E${r}`, 7, lineaItem.participacion_pct, true),
        ].join(""),
      );
      finDatos = r;
      r += 1;
    }
    fila(
      r,
      `${celda(`A${r}`, 9, "Participación total")}${celda(`E${r}`, 10, version.participacion_total, true)}`,
      20,
    );
    merges.push(`A${r}:D${r}`);
    r += 1;
  }

  const ultima = r - 1;
  const filtro =
    version.lineas.length > 0 ? `<autoFilter ref="A${cabeza}:E${finDatos}"/>` : "";
  const cols = [24, 46, 14, 12, 18]
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:E${ultima}"/>
<sheetViews>
<sheetView showGridLines="0" tabSelected="1" workbookViewId="0">
<pane ySplit="${cabeza}" topLeftCell="A${cabeza + 1}" activePane="bottomLeft" state="frozen"/>
<selection pane="bottomLeft" activeCell="A${cabeza + 1}" sqref="A${cabeza + 1}"/>
</sheetView>
</sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${cols}</cols>
<sheetData>${filas.join("")}</sheetData>
${filtro}
<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0" paperSize="9"/>
<headerFooter>
<oddFooter>&amp;LCalidad en cada paso&amp;CPág. &amp;P&amp;RGRANADO</oddFooter>
</headerFooter>
</worksheet>`;
}

function armarXlsx(version: VersionVista) {
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
<sheets><sheet name="Receta" sheetId="1" r:id="rId1"/></sheets>
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
    { nombre: "xl/worksheets/sheet1.xml", datos: encoder.encode(hojaReceta(version)) },
  ]);
}

function bajar(nombre: string, bytes: Uint8Array, extension: string, mime: string) {
  const limpio =
    nombre.replace(/[<>:"/\\|?*]/g, "_").replace(/\.(xlsx|xls|pdf)$/i, "").trim() || "Detalle de receta";
  const copia = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copia).set(bytes);
  const url = URL.createObjectURL(new Blob([copia], { type: mime }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${limpio}.${extension}`;
  enlace.click();
  URL.revokeObjectURL(url);
}

export function descargarDetalleRecetaExcel(nombre: string, version: VersionVista) {
  bajar(
    nombre,
    armarXlsx(version),
    "xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
