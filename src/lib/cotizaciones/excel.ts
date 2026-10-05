import { ENCABEZADOS_INFORME_PRODUCTOS as ENCABEZADOS } from "@/lib/cotizaciones/logic";

const ANCHOS = [15.140625, 15.140625, 44, 10, 14.5703125, 16.140625, 13, 13];
const LETRAS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

function xml(valor: string) {
  return valor
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function texto(valor: string | number | null) {
  return xml(valor == null ? "" : String(valor)).slice(0, 32767);
}

function numero(valor: string | number | null) {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function celdaTexto(ref: string, valor: string | number | null) {
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${texto(valor)}</t></is></c>`;
}

function celdaNumero(ref: string, estilo: number, valor: string | number | null) {
  return `<c r="${ref}" s="${estilo}"><v>${numero(valor)}</v></c>`;
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
    const nombre = encoder.encode(archivo.nombre);
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
      u16(nombre.length),
      u16(0),
      nombre,
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
        u16(nombre.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nombre,
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

function hojaXml(filas: (string | number | null)[][]) {
  const ultima = Math.max(2, filas.length + 1);
  const ref = `A1:H${ultima}`;
  const cols = ANCHOS.map(
    (w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`,
  ).join("");
  const encabezado = ENCABEZADOS.map((nombre, i) => celdaTexto(`${LETRAS[i]}1`, nombre)).join("");
  const datos = filas.map((fila, idx) => {
    const n = idx + 2;
    return `<row r="${n}">${celdaTexto(`A${n}`, fila[0])}${celdaTexto(`B${n}`, fila[1])}${celdaTexto(`C${n}`, fila[2])}${celdaNumero(`D${n}`, 1, fila[3])}${celdaNumero(`E${n}`, 2, fila[4])}${celdaNumero(`F${n}`, 3, fila[5])}${celdaNumero(`G${n}`, 3, fila[6])}${celdaNumero(`H${n}`, 3, fila[7])}</row>`;
  });
  if (!filas.length) datos.push(`<row r="2"/>`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="${ref}"/>
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData><row r="1">${encabezado}</row>${datos.join("")}</sheetData>
<tableParts count="1"><tablePart r:id="rId1"/></tableParts>
</worksheet>`;
}

function tablaXml(filas: (string | number | null)[][]) {
  const ultima = Math.max(2, filas.length + 1);
  const ref = `A1:H${ultima}`;
  const columnas = ENCABEZADOS.map((nombre, i) => `<tableColumn id="${i + 1}" name="${xml(nombre)}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="Tabla1" displayName="Tabla1" ref="${ref}" totalsRowShown="0">
<autoFilter ref="${ref}"/>
<tableColumns count="8">${columnas}</tableColumns>
<tableStyleInfo name="TableStyleMedium9" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>`;
}

function armarXlsx(filas: (string | number | null)[][]) {
  const encoder = new TextEncoder();
  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Productos" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  const sheetRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>
</Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2">
<numFmt numFmtId="164" formatCode="#,##0"/>
<numFmt numFmtId="165" formatCode="_-&quot;$&quot;\\ * #,##0.00_-;\\-&quot;$&quot;\\ * #,##0.00_-;_-&quot;$&quot;\\ * &quot;-&quot;??_-;_-@_-"/>
</numFmts>
<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
</styleSheet>`;
  return zipStore([
    { nombre: "[Content_Types].xml", datos: encoder.encode(tipos) },
    { nombre: "_rels/.rels", datos: encoder.encode(rels) },
    { nombre: "xl/workbook.xml", datos: encoder.encode(workbook) },
    { nombre: "xl/_rels/workbook.xml.rels", datos: encoder.encode(workbookRels) },
    { nombre: "xl/styles.xml", datos: encoder.encode(styles) },
    { nombre: "xl/worksheets/sheet1.xml", datos: encoder.encode(hojaXml(filas)) },
    { nombre: "xl/worksheets/_rels/sheet1.xml.rels", datos: encoder.encode(sheetRels) },
    { nombre: "xl/tables/table1.xml", datos: encoder.encode(tablaXml(filas)) },
  ]);
}

export function descargarExcelCotizacionProductos(nombre: string, filas: (string | number | null)[][]) {
  const limpio = nombre.replace(/[<>:"/\\|?*]/g, "_").replace(/\.(xlsx|xls|pdf)$/i, "").trim() || "Cotizacion productos";
  const bytes = armarXlsx(filas);
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${limpio}.xlsx`;
  enlace.click();
  URL.revokeObjectURL(url);
}
