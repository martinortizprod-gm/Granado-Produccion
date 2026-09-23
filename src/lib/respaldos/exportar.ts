import { escaparPdf } from "@/lib/informes/descarga";
import type { FormatoRespaldo, TablaExport } from "@/lib/respaldos/tipos";

const MAX_PDF_FILAS = 2000;
const MAX_XLSX_FILAS = 1_048_575;

export function marcaRespaldo(usuario: string) {
  const ahora = new Date();
  const fecha = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
  const cuando = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(ahora);
  return {
    archivoBase: `respaldo-granado-${fecha}`,
    cuando,
    usuario: usuario.trim() || "—",
  };
}

function textoCelda(valor: unknown) {
  if (valor == null) return "";
  if (typeof valor === "string") return valor;
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  return JSON.stringify(valor);
}

function sqlId(nombre: string) {
  return `"${nombre.replace(/"/g, "\"\"")}"`;
}

function sqlLiteral(valor: unknown) {
  if (valor == null) return "NULL";
  if (typeof valor === "number") return Number.isFinite(valor) ? String(valor) : "NULL";
  if (typeof valor === "boolean") return valor ? "TRUE" : "FALSE";
  const texto = typeof valor === "string" ? valor : JSON.stringify(valor);
  return `'${texto.replace(/'/g, "''")}'`;
}

function armarSql(tablas: TablaExport[], cuando: string, usuario: string) {
  const lineas = [
    "-- Respaldo Granado Producción",
    `-- Generado: ${cuando}`,
    `-- Usuario: ${usuario}`,
    "-- Datos seleccionados en formato INSERT.",
    "-- No borra filas. Si el id ya existe, el INSERT puede fallar por clave duplicada.",
    "",
    "BEGIN;",
    "",
  ];
  for (const tabla of tablas) {
    if (!tabla.filas.length) {
      lineas.push(`-- ${tabla.nombre}: sin filas`, "");
      continue;
    }
    const cols = tabla.columnas.map(sqlId).join(", ");
    const destino = `public.${sqlId(tabla.nombre)}`;
    for (let i = 0; i < tabla.filas.length; i += 200) {
      const trozo = tabla.filas.slice(i, i + 200);
      lineas.push(`INSERT INTO ${destino} (${cols}) VALUES`);
      lineas.push(
        trozo
          .map((fila) => `  (${tabla.columnas.map((c) => sqlLiteral(fila[c])).join(", ")})`)
          .join(",\n") + ";",
      );
      lineas.push("");
    }
  }
  lineas.push("COMMIT;", "");
  return lineas.join("\n");
}

function armarJson(tablas: TablaExport[], cuando: string, usuario: string) {
  return JSON.stringify(
    {
      sistema: "Granado Producción",
      formato: "respaldo-json-v1",
      generado: cuando,
      usuario,
      tablas: tablas.map((tabla) => ({
        nombre: tabla.nombre,
        columnas: tabla.columnas,
        filas: tabla.filas.map((fila) => {
          const row: Record<string, unknown> = {};
          for (const col of tabla.columnas) row[col] = fila[col] ?? null;
          return row;
        }),
      })),
    },
    null,
    2,
  );
}

function xml(valor: string) {
  return valor
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colLetra(indice: number) {
  let n = indice + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function nombreHoja(nombre: string, usados: Set<string>) {
  const base = nombre.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Tabla";
  let candidato = base;
  let i = 2;
  while (usados.has(candidato)) {
    const sufijo = `_${i}`;
    candidato = `${base.slice(0, 31 - sufijo.length)}${sufijo}`;
    i += 1;
  }
  usados.add(candidato);
  return candidato;
}

function celdaXlsx(valor: unknown, ref: string) {
  if (valor == null || valor === "") return `<c r="${ref}"/>`;
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return `<c r="${ref}"><v>${valor}</v></c>`;
  }
  const texto = textoCelda(valor).slice(0, 32767);
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(texto)}</t></is></c>`;
}

function hojaXlsx(tabla: TablaExport) {
  if (tabla.filas.length > MAX_XLSX_FILAS) {
    throw new Error(`${tabla.nombre} supera el máximo de filas de una hoja de Excel.`);
  }
  const filas = [`<row r="1">${tabla.columnas.map((col, i) => celdaXlsx(col, `${colLetra(i)}1`)).join("")}</row>`];
  tabla.filas.forEach((fila, idx) => {
    const n = idx + 2;
    const celdas = tabla.columnas
      .map((col, i) => celdaXlsx(fila[col], `${colLetra(i)}${n}`))
      .join("");
    filas.push(`<row r="${n}">${celdas}</row>`);
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${filas.join("")}</sheetData></worksheet>`;
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
  const eocd = unir([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(archivos.length),
    u16(archivos.length),
    u32(dir.length),
    u32(offset),
    u16(0),
  ]);
  return unir([...locales, dir, eocd]);
}

function armarXlsx(tablas: TablaExport[]) {
  const usados = new Set<string>();
  const hojas = tablas.map((tabla, i) => ({
    archivo: `xl/worksheets/sheet${i + 1}.xml`,
    nombre: nombreHoja(tabla.nombre, usados),
    xml: hojaXlsx(tabla),
  }));
  const encoder = new TextEncoder();
  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${hojas.map((h, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${hojas.map((h, i) => `<sheet name="${xml(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}
</sheets>
</workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hojas.map((h, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}
<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;
  return zipStore([
    { nombre: "[Content_Types].xml", datos: encoder.encode(tipos) },
    { nombre: "_rels/.rels", datos: encoder.encode(rels) },
    { nombre: "xl/workbook.xml", datos: encoder.encode(workbook) },
    { nombre: "xl/_rels/workbook.xml.rels", datos: encoder.encode(workbookRels) },
    { nombre: "xl/styles.xml", datos: encoder.encode(styles) },
    ...hojas.map((h) => ({ nombre: h.archivo, datos: encoder.encode(h.xml) })),
  ]);
}

function pushTexto(buf: number[], texto: string) {
  for (let i = 0; i < texto.length; i += 1) buf.push(texto.charCodeAt(i));
}

function recortar(valor: string, max: number) {
  if (valor.length <= max) return valor;
  return `${valor.slice(0, Math.max(1, max - 3))}...`;
}

function gruposColumnas(columnas: string[]) {
  if (columnas.length <= 8) return [columnas];
  const grupos: string[][] = [];
  const resto = columnas.slice(1);
  for (let i = 0; i < resto.length; i += 6) {
    grupos.push([columnas[0], ...resto.slice(i, i + 6)]);
  }
  return grupos;
}

function bytesPdf(ancho: number, alto: number, paginas: number[][]) {
  const buf: number[] = [];
  const offsets: number[] = [];
  const obj = (n: number, cuerpo: string) => {
    offsets[n] = buf.length;
    pushTexto(buf, `${n} 0 obj\n${cuerpo}\nendobj\n`);
  };
  const nPaginas = paginas.length;
  const primerContenido = 3 + nPaginas;
  const idFont = primerContenido + nPaginas;
  const idFontB = idFont + 1;
  const idFontI = idFontB + 1;
  const kids = paginas.map((_, i) => `${3 + i} 0 R`).join(" ");
  pushTexto(buf, "%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${nPaginas} >>`);
  paginas.forEach((ops, i) => {
    const idPagina = 3 + i;
    const idContenido = primerContenido + i;
    obj(
      idPagina,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Contents ${idContenido} 0 R /Resources << /Font << /F1 ${idFont} 0 R /F2 ${idFontB} 0 R /F3 ${idFontI} 0 R >> >> >>`,
    );
  });
  paginas.forEach((ops, i) => {
    const idContenido = primerContenido + i;
    offsets[idContenido] = buf.length;
    pushTexto(buf, `${idContenido} 0 obj\n<< /Length ${ops.length} >>\nstream\n`);
    for (let k = 0; k < ops.length; k += 1) buf.push(ops[k]);
    pushTexto(buf, "\nendstream\nendobj\n");
  });
  obj(idFont, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  obj(idFontB, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  obj(idFontI, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>");
  const xref = buf.length;
  pushTexto(buf, `xref\n0 ${idFontI + 1}\n`);
  pushTexto(buf, "0000000000 65535 f \n");
  for (let i = 1; i <= idFontI; i += 1) {
    pushTexto(buf, `${String(offsets[i] ?? 0).padStart(10, "0")} 00000 n \n`);
  }
  pushTexto(buf, `trailer\n<< /Size ${idFontI + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const out = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i += 1) out[i] = buf[i];
  return out;
}

function armarPdf(tablas: TablaExport[], cuando: string, usuario: string) {
  const ancho = 842;
  const alto = 595;
  const margen = 28;
  const altoFila = 13;
  const tam = 7;
  const filasPorPagina = Math.floor((alto - 92) / altoFila);
  const paginas: number[][] = [];

  const poner = (ops: number[], x: number, y: number, size: number, valor: string, negrita = false) => {
    const fuente = negrita ? "F2" : "F1";
    pushTexto(ops, `BT /${fuente} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (`);
    ops.push(...escaparPdf(valor));
    pushTexto(ops, ") Tj ET\n");
  };

  for (const tabla of tablas) {
    if (!tabla.filas.length) {
      const ops: number[] = [];
      poner(ops, margen, alto - 34, 12, `Respaldo · ${tabla.nombre}`, true);
      poner(ops, margen, alto - 50, 8, `Sin filas  ·  ${cuando}  ·  ${usuario}`);
      paginas.push(ops);
      continue;
    }
    const limite = Math.min(tabla.filas.length, MAX_PDF_FILAS);
    const aviso =
      tabla.filas.length > MAX_PDF_FILAS
        ? `Se listan ${MAX_PDF_FILAS.toLocaleString("es-AR")} de ${tabla.filas.length.toLocaleString("es-AR")} filas. El respaldo completo está en JSON, SQL o XLSX.`
        : `${tabla.filas.length.toLocaleString("es-AR")} filas`;
    const grupos = gruposColumnas(tabla.columnas);
    const bloques = tabla.filas.slice(0, limite);
    for (const grupo of grupos) {
      const col = (ancho - margen * 2) / Math.max(1, grupo.length);
      const maxChars = Math.max(4, Math.floor(col / (tam * 0.5)));
      const cortes = Math.max(1, Math.ceil(bloques.length / filasPorPagina) || 1);
      for (let p = 0; p < cortes; p += 1) {
        const ops: number[] = [];
        const trozo = bloques.slice(p * filasPorPagina, (p + 1) * filasPorPagina);
        poner(ops, margen, alto - 34, 12, `Respaldo · ${tabla.nombre}`, true);
        poner(ops, margen, alto - 50, 8, `${aviso}  ·  ${cuando}  ·  ${usuario}`);
        let y = alto - 70;
        grupo.forEach((enc, i) => poner(ops, margen + i * col, y, tam, recortar(enc, maxChars), true));
        y -= altoFila;
        if (!trozo.length) {
          poner(ops, margen, y, tam, "Sin filas");
        }
        for (const fila of trozo) {
          grupo.forEach((enc, i) => {
            poner(ops, margen + i * col, y, tam, recortar(textoCelda(fila[enc]), maxChars));
          });
          y -= altoFila;
        }
        paginas.push(ops);
      }
    }
  }

  if (!paginas.length) {
    const ops: number[] = [];
    poner(ops, 28, alto - 34, 12, "Respaldo", true);
    poner(ops, 28, alto - 54, 8, "Sin tablas para listar");
    paginas.push(ops);
  }
  return bytesPdf(ancho, alto, paginas);
}

function aUtf8(texto: string) {
  return new TextEncoder().encode(texto);
}

export function exportarRespaldo(
  formato: FormatoRespaldo,
  tablas: TablaExport[],
  meta: { archivoBase: string; cuando: string; usuario: string },
) {
  if (formato === "json") {
    return {
      nombre: `${meta.archivoBase}.json`,
      mime: "application/json; charset=utf-8",
      bytes: aUtf8(armarJson(tablas, meta.cuando, meta.usuario)),
    };
  }
  if (formato === "sql") {
    return {
      nombre: `${meta.archivoBase}.sql`,
      mime: "application/sql; charset=utf-8",
      bytes: aUtf8(armarSql(tablas, meta.cuando, meta.usuario)),
    };
  }
  if (formato === "xlsx") {
    return {
      nombre: `${meta.archivoBase}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes: armarXlsx(tablas),
    };
  }
  return {
    nombre: `${meta.archivoBase}.pdf`,
    mime: "application/pdf",
    bytes: armarPdf(tablas, meta.cuando, meta.usuario),
  };
}
