/** Descarga de informes sin dependencias nuevas. Excel abre el XML; el PDF es una tabla. */

function xml(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function nombreArchivo(nombre: string, extension: string) {
  const limpio = nombre.replace(/[<>:"/\\|?*]/g, "_").replace(/\.(xls|pdf)$/i, "").trim() || "informe";
  return `${limpio}.${extension}`;
}

function bajar(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export function descargarExcel(
  nombre: string,
  hoja: string,
  encabezados: string[],
  filas: (string | number | null)[][],
) {
  const celda = (valor: string | number | null) => {
    if (typeof valor === "number" && Number.isFinite(valor)) {
      return `<Cell><Data ss:Type="Number">${valor}</Data></Cell>`;
    }
    return `<Cell><Data ss:Type="String">${xml(valor == null ? "" : String(valor))}</Data></Cell>`;
  };
  const filasXml = [encabezados, ...filas]
    .map((fila) => `<Row>${fila.map(celda).join("")}</Row>`)
    .join("");
  const doc = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${xml(hoja).slice(0, 31) || "Informe"}"><Table>${filasXml}</Table></Worksheet>
</Workbook>`;
  bajar(nombreArchivo(nombre, "xls"), new Blob([doc], { type: "application/vnd.ms-excel" }));
}

const WIN: Record<string, number> = {
  á: 0xe1, é: 0xe9, í: 0xed, ó: 0xf3, ú: 0xfa, ñ: 0xf1, ü: 0xfc,
  Á: 0xc1, É: 0xc9, Í: 0xcd, Ó: 0xd3, Ú: 0xda, Ñ: 0xd1, Ü: 0xdc,
  "°": 0xb0, "–": 0x96, "—": 0x97,
};

function bytesTexto(valor: string) {
  const out: number[] = [];
  for (const ch of valor) {
    const code = ch.codePointAt(0) ?? 63;
    if (WIN[ch] != null) out.push(WIN[ch]);
    else if (code >= 32 && code < 127) out.push(code);
    else out.push(63);
  }
  return out;
}

function escaparPdf(valor: string) {
  const bytes = bytesTexto(valor);
  const out: number[] = [];
  for (const b of bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c);
    out.push(b);
  }
  return out;
}

function recortar(valor: string, max: number) {
  if (valor.length <= max) return valor;
  return `${valor.slice(0, Math.max(1, max - 3))}...`;
}

export function descargarPdf(
  nombre: string,
  titulo: string,
  encabezados: string[],
  filas: (string | number | null)[][],
) {
  const ancho = 842;
  const alto = 595;
  const margen = 28;
  const altoFila = 14;
  const tam = encabezados.length > 10 ? 7 : 8;
  const anchoUtil = ancho - margen * 2;
  const col = anchoUtil / Math.max(1, encabezados.length);
  const maxChars = Math.max(4, Math.floor(col / (tam * 0.48)));
  const filasPorPagina = Math.floor((alto - 70) / altoFila);

  const paginas: number[][] = [];
  const bloques = filas.length ? filas : [];
  const cortes = Math.max(1, Math.ceil(bloques.length / filasPorPagina) || 1);
  for (let p = 0; p < cortes; p += 1) {
    const trozo = bloques.slice(p * filasPorPagina, (p + 1) * filasPorPagina);
    const ops: number[] = [];
    const poner = (x: number, y: number, size: number, texto: string, negrita = false) => {
      const fuente = negrita ? "F2" : "F1";
      const cmd = `BT /${fuente} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (`;
      for (let i = 0; i < cmd.length; i += 1) ops.push(cmd.charCodeAt(i));
      ops.push(...escaparPdf(recortar(texto, maxChars)));
      const fin = ") Tj ET\n";
      for (let i = 0; i < fin.length; i += 1) ops.push(fin.charCodeAt(i));
    };
    poner(margen, alto - 36, 12, titulo, true);
    let y = alto - 58;
    encabezados.forEach((enc, i) => poner(margen + i * col, y, tam, enc, true));
    y -= altoFila;
    for (const fila of trozo) {
      fila.forEach((valor, i) => poner(margen + i * col, y, tam, valor == null ? "" : String(valor)));
      y -= altoFila;
    }
    paginas.push(ops);
  }

  const buf: number[] = [];
  const add = (s: string) => {
    for (let i = 0; i < s.length; i += 1) buf.push(s.charCodeAt(i));
  };
  add("%PDF-1.4\n");
  const offsets: number[] = [];
  const obj = (n: number, cuerpo: string | number[]) => {
    offsets[n] = buf.length;
    add(`${n} 0 obj\n`);
    if (typeof cuerpo === "string") add(cuerpo);
    else buf.push(...cuerpo);
    add("\nendobj\n");
  };
  const nPaginas = paginas.length;
  const idPaginas = 2;
  const primerContenido = 3 + nPaginas;
  const idFont = primerContenido + nPaginas;
  const idFontB = idFont + 1;
  const kids = paginas.map((_, i) => `${3 + i} 0 R`).join(" ");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(idPaginas, `<< /Type /Pages /Kids [${kids}] /Count ${nPaginas} >>`);
  paginas.forEach((ops, i) => {
    const idPagina = 3 + i;
    const idContenido = primerContenido + i;
    obj(
      idPagina,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Contents ${idContenido} 0 R /Resources << /Font << /F1 ${idFont} 0 R /F2 ${idFontB} 0 R >> >> >>`,
    );
    const stream = [`${idContenido} 0 obj\n<< /Length ${ops.length} >>\nstream\n`];
    offsets[idContenido] = buf.length;
    add(stream[0]);
    buf.push(...ops);
    add("\nendstream\nendobj\n");
  });
  obj(idFont, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  obj(idFontB, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const xref = buf.length;
  add(`xref\n0 ${idFontB + 1}\n`);
  add("0000000000 65535 f \n");
  for (let i = 1; i <= idFontB; i += 1) {
    const off = offsets[i] ?? 0;
    add(`${String(off).padStart(10, "0")} 00000 n \n`);
  }
  add(`trailer\n<< /Size ${idFontB + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  bajar(nombreArchivo(nombre, "pdf"), new Blob([new Uint8Array(buf)], { type: "application/pdf" }));
}
