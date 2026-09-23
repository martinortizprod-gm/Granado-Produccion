import { escaparPdf, publicarPdf } from "@/lib/informes/descarga";
import { datosEmision } from "@/lib/informes/emision";
import { PlanDosificacion, nroDec } from "@/lib/produccion/logic";
import { SolicitudVista, fechaVisible, nroVisible } from "@/lib/solicitudes/logic";

const ANCHO = 595;
const ALTO = 842;
const VERDE = [61, 122, 86];
const TEXTO = [31, 42, 36];
const MUTED = [92, 107, 99];
const BORDE = [96, 128, 110];
const VERDE_SUAVE = [231, 246, 236];
const VERDE_TIT = [46, 90, 64];

type Rgb = number[];

function cmd(ops: number[], texto: string) {
  for (let i = 0; i < texto.length; i += 1) ops.push(texto.charCodeAt(i));
}

function rgb(ops: number[], color: Rgb, trazo = false) {
  cmd(ops, `${(color[0] / 255).toFixed(3)} ${(color[1] / 255).toFixed(3)} ${(color[2] / 255).toFixed(3)} ${trazo ? "RG" : "rg"}\n`);
}

function rect(ops: number[], x: number, yTop: number, w: number, h: number, relleno: Rgb | null, borde: Rgb | null) {
  const y = ALTO - yTop - h;
  if (relleno) rgb(ops, relleno);
  if (borde) {
    rgb(ops, borde, true);
    cmd(ops, "1.15 w\n");
  }
  cmd(ops, `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re ${relleno && borde ? "B" : relleno ? "f" : "S"}\n`);
}

function linea(ops: number[], x1: number, y1: number, x2: number, y2: number, color: Rgb, grosor = 0.4) {
  rgb(ops, color, true);
  cmd(ops, `${grosor} w\n${x1.toFixed(1)} ${(ALTO - y1).toFixed(1)} m ${(x2).toFixed(1)} ${(ALTO - y2).toFixed(1)} l S\n`);
}

function circulo(ops: number[], cx: number, cyTop: number, r: number, color: Rgb) {
  const cy = ALTO - cyTop;
  const k = r * 0.5522847498;
  rgb(ops, color);
  cmd(
    ops,
    `${(cx + r).toFixed(2)} ${cy.toFixed(2)} m ${(cx + r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c ${(cx - k).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c ${(cx - r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c ${(cx + k).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c f\n`,
  );
}

function texto(ops: number[], x: number, yTop: number, size: number, valor: string, fuente: "F1" | "F2" | "F3", color: Rgb) {
  rgb(ops, color);
  const y = ALTO - yTop - size;
  const inicio = `BT /${fuente} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (`;
  cmd(ops, inicio);
  ops.push(...escaparPdf(valor));
  cmd(ops, ") Tj ET\n");
}

function partir(etiqueta: string) {
  for (const sep of ["  —  ", " — ", "  -  ", " - "]) {
    const i = etiqueta.indexOf(sep);
    if (i >= 0) return [etiqueta.slice(0, i).trim(), etiqueta.slice(i + sep.length).trim()];
  }
  return ["", etiqueta];
}

function textoArt(codigo: string, nombre: string) {
  if (codigo && nombre) return `${codigo}  —  ${nombre}`;
  return codigo || nombre || "—";
}

function recortarAncho(valor: string, size: number, ancho: number) {
  const max = Math.max(4, Math.floor(ancho / (size * 0.48)));
  if (valor.length <= max) return valor;
  return `${valor.slice(0, max - 3)}...`;
}

export function descargarPlanPdf(input: {
  solicitud: SolicitudVista;
  plan: PlanDosificacion;
  operarios: string[];
  encargado: string;
  equipos: string[];
  barridos: string[];
}) {
  const { solicitud, plan } = input;
  const paginas: number[][] = [];
  let ops: number[] = [];
  const x0 = 34;
  const ancho = 527;
  const { cuando, usuario } = datosEmision();
  const usuarioCorto = recortarAncho(usuario, 8, 150);
  rect(ops, 0, 0, ANCHO, 40, VERDE, null);
  texto(ops, x0, 14, 13, "GRANADO", "F2", [244, 246, 243]);
  linea(ops, 118, 12, 118, 28, [200, 220, 208], 0.6);
  texto(ops, 128, 15, 11, "Plan de dosificación", "F1", [244, 246, 243]);
  texto(ops, ANCHO - 34 - cuando.length * 4.1, 6, 8, cuando, "F1", [244, 246, 243]);
  texto(ops, ANCHO - 34 - usuarioCorto.length * 4.1, 18, 8, usuarioCorto, "F1", [244, 246, 243]);

  let y = 48;
  const pie = () => {
    linea(ops, x0, 812, x0 + ancho, 812, BORDE, 0.9);
    texto(ops, x0, 822, 8, "Calidad en cada paso", "F3", MUTED);
    texto(ops, x0 + ancho - 62, 822, 9, "GRANADO", "F2", VERDE);
  };
  const yCard = y;
  texto(ops, x0 + 10, y + 6, 11, "Información general", "F2", TEXTO);
  const estado = `Estado: ${solicitud.estado_etiqueta || "—"}`;
  const wBadge = Math.min(160, Math.max(90, estado.length * 4.2 + 16));
  rect(ops, x0 + ancho - 10 - wBadge, y + 6, wBadge, 16, [255, 246, 216], [230, 210, 122]);
  texto(ops, x0 + ancho - 10 - wBadge + 8, y + 9, 8, estado, "F2", [196, 123, 43]);
  y += 22;
  const dato = (dx: number, dy: number, w: number, etiqueta: string, valor: string, tam = 10) => {
    texto(ops, dx, dy, 7, etiqueta, "F1", MUTED);
    texto(ops, dx, dy + 9, tam, recortarAncho(valor || "—", tam, w), "F2", TEXTO);
  };
  dato(x0 + 10, y, 110, "Lote", solicitud.lote || "—");
  dato(x0 + 130, y, 140, "Orden de compra", solicitud.orden_compra || "—");
  dato(x0 + 280, y, 140, "Orden de producción", solicitud.orden_produccion || "—");
  dato(x0 + 430, y, 90, "Receta", solicitud.receta_plc || "—");
  y += 22;
  linea(ops, x0 + 10, y, x0 + ancho - 10, y, [230, 236, 231], 0.4);
  y += 5;
  dato(x0 + 10, y, 120, "Código", solicitud.codigo_producto || "—", 10);
  dato(x0 + 140, y, 370, "Producto", solicitud.producto || "—", 10);
  y += 22;
  linea(ops, x0 + 10, y, x0 + ancho - 10, y, [230, 236, 231], 0.4);
  y += 5;
  dato(x0 + 10, y, 160, "Fecha de registro", fechaVisible(solicitud.fecha_registro), 9);
  dato(x0 + 190, y, 170, "Fecha estimada de fin", fechaVisible(solicitud.fecha_estimada), 9);
  dato(x0 + 380, y, 140, "Versión asignada", solicitud.version || "—", 9);
  y += 22;
  linea(ops, x0 + 10, y, x0 + ancho - 10, y, [230, 236, 231], 0.4);
  y += 5;
  dato(x0 + 10, y, 250, "Tipo de envase", textoArt(solicitud.codigo_envase, solicitud.envase), 8);
  dato(x0 + 280, y, 230, "Tipo de etiqueta", textoArt(solicitud.codigo_etiqueta, solicitud.nombre_etiqueta), 8);
  y += 22;
  linea(ops, x0 + 10, y, x0 + ancho - 10, y, [230, 236, 231], 0.4);
  y += 5;
  const resumen = [
    ["Pallets solicitados", nroDec(solicitud.pallets_solicitados)],
    ["Unidades solicitadas", nroDec(solicitud.unidades_solicitadas)],
    ["Kg solicitados", `${nroDec(solicitud.kg_solicitados)} kg`],
  ];
  resumen.forEach(([etiqueta, valor], indice) => {
    const xx = x0 + 10 + indice * 170;
    circulo(ops, xx + 4, y + 8, 4, VERDE);
    texto(ops, xx + 14, y, 7, etiqueta, "F1", MUTED);
    texto(ops, xx + 14, y + 10, 10, valor, "F2", TEXTO);
  });
  y += 22;
  rect(ops, x0, yCard, ancho, y - yCard, null, BORDE);

  y += 8;
  const operarios = input.operarios.length ? input.operarios : ["Sin cargar"];
  const encargado = input.encargado ? [input.encargado] : ["Sin cargar"];
  const barridos = input.barridos.length ? input.barridos : ["Sin cargar"];
  const equipos = input.equipos.length ? input.equipos : ["Sin cargar"];
  const bloques = [
    ["Operarios responsables", operarios],
    ["Encargado de producción", encargado],
    ["Barrido de línea", barridos],
  ] as const;
  const altoIzq = 20 + bloques.reduce((s, [, vals]) => s + 11 + vals.length * 10 + 2, 0);
  const altoDer = 20 + 10 + equipos.length * 11 + 6;
  const altoPrev = Math.max(altoIzq, altoDer, 70);
  rect(ops, x0, y, 258, altoPrev, null, BORDE);
  rect(ops, x0 + 269, y, 258, altoPrev, null, BORDE);
  texto(ops, x0 + 10, y + 8, 10, "Equipo y producción", "F2", TEXTO);
  texto(ops, x0 + 279, y + 8, 10, "Limpieza previa de equipos", "F2", TEXTO);
  let yi = y + 22;
  for (const [titulo, valores] of bloques) {
    texto(ops, x0 + 10, yi, 8, titulo, "F2", VERDE_TIT);
    yi += 11;
    for (const valor of valores) {
      const vacio = valor === "Sin cargar";
      texto(ops, x0 + 10, yi, 8, recortarAncho(valor, 8, 230), vacio ? "F3" : "F1", vacio ? MUTED : TEXTO);
      yi += 10;
    }
    yi += 2;
  }
  let yd = y + 22;
  for (const valor of equipos) {
    const vacio = valor === "Sin cargar";
    if (!vacio) circulo(ops, x0 + 286, yd + 4, 2.8, VERDE);
    texto(ops, x0 + (vacio ? 279 : 294), yd, 8, recortarAncho(valor, 8, 210), vacio ? "F3" : "F1", vacio ? MUTED : TEXTO);
    yd += 11;
  }
  y += altoPrev + 8;

  const yPlan = y;
  texto(ops, x0 + 10, y + 6, 11, "Datos de dosificación", "F2", TEXTO);
  y += 20;
  const campos = [
    ["Pallets a elaborar", nroDec(plan.pallets)],
    ["Unidades por pallet", nroDec(plan.unidadesPorPallet)],
    ["Peso unitario (kg)", nroDec(plan.pesoUnitario)],
    ["Kg totales por pallets", `${nroDec(plan.kgPorPallet)} kg`],
    ["Batchs por pallet", nroDec(plan.batchsPorPallet, 1)],
    ["Kg por batch", `${nroDec(plan.kgPorBatch)} kg`],
  ];
  campos.forEach(([etiqueta, valor], indice) => {
    const col = indice % 3;
    const fila = Math.floor(indice / 3);
    const xx = x0 + 10 + col * 118;
    const yy = y + fila * 26;
    rect(ops, xx, yy, 112, 24, VERDE_SUAVE, null);
    texto(ops, xx + 6, yy + 3, 7, etiqueta, "F1", MUTED);
    texto(ops, xx + 6, yy + 12, 10, valor, "F2", TEXTO);
  });
  rect(ops, x0 + 364, y, 153, 50, VERDE_SUAVE, null);
  texto(ops, x0 + 364, y + 8, 8, "Batchs a pesar", "F1", MUTED);
  const batchsTxt = plan.batchsTotales > 0.0005 ? (Math.abs(plan.batchsTotales - Math.round(plan.batchsTotales)) < 0.05 ? String(Math.round(plan.batchsTotales)) : nroDec(plan.batchsTotales, 1)) : "-";
  texto(ops, x0 + 400, y + 22, 16, batchsTxt, "F2", TEXTO);
  const yTotal = y + 54;
  rect(ops, x0 + 246, yTotal, 112, 24, VERDE_SUAVE, null);
  texto(ops, x0 + 252, yTotal + 3, 7, "Kg totales a producir", "F1", MUTED);
  texto(ops, x0 + 252, yTotal + 12, 9, plan.kgTotales > 0 ? `${nroDec(plan.kgTotales)} kg` : "-", "F2", TEXTO);
  y += 84;
  texto(ops, x0 + 10, y, 11, "Ingredientes a dosificar", "F2", TEXTO);
  y += 14;
  const anchos = [70, 190, 90, 85, 82];
  const titulos = ["Código", "Ingrediente", "% participación", "Kg por batch", "Kg totales"];
  let xx = x0;
  rect(ops, x0, y, anchos.reduce((s, n) => s + n, 0), 13, [221, 232, 223], null);
  titulos.forEach((titulo, i) => {
    texto(ops, xx + 4, y + 3, 7, titulo, "F2", MUTED);
    xx += anchos[i];
  });
  y += 13;
  const totPct = plan.lineas.reduce((s, linea) => s + linea.participacion, 0) * 100;
  const totBatch = plan.lineas.reduce((s, linea) => s + linea.kgPorBatch, 0);
  const totKg = plan.lineas.reduce((s, linea) => s + linea.kgTotales, 0);
  const filas = plan.lineas.map((linea) => {
    const [codigo, nombre] = partir(linea.etiqueta);
    return [
      codigo || "-",
      nombre || linea.etiqueta,
      `${nroVisible(linea.participacion * 100, 2)} %`,
      plan.batchsPorPallet > 0 ? nroDec(linea.kgPorBatch) : "-",
      plan.kgTotales > 0 ? nroDec(linea.kgTotales) : "-",
    ];
  });
  if (filas.length) {
    filas.push(["", "Totales", `${nroVisible(totPct, 2)} %`, plan.batchsPorPallet > 0 ? nroDec(totBatch) : "-", plan.kgTotales > 0 ? nroDec(totKg) : "-"]);
  }
  filas.forEach((fila, indice) => {
    const total = indice === filas.length - 1;
    if (total) rect(ops, x0, y, anchos.reduce((s, n) => s + n, 0), 12, [150, 176, 160], null);
    else if (indice % 2 === 1) rect(ops, x0, y, anchos.reduce((s, n) => s + n, 0), 12, [244, 246, 243], null);
    let cx = x0;
    fila.forEach((valor, i) => {
      texto(ops, cx + 4, y + 3, 7, recortarAncho(valor, 7, anchos[i] - 8), total ? "F2" : "F1", TEXTO);
      cx += anchos[i];
    });
    y += 12;
  });
  y += 6;
  rect(ops, x0, yPlan, ancho, y - yPlan, null, BORDE);

  const yCierre = y;
  texto(ops, x0 + 10, y + 6, 11, "Observaciones", "F2", TEXTO);
  y += 20;
  for (let i = 0; i < 4; i += 1) {
    linea(ops, x0 + 10, y, x0 + ancho - 10, y, BORDE, 0.7);
    y += 14;
  }
  y += 2;
  const declaracion = [
    "Declaro haber realizado el seguimiento y control de la producción, efectuando los",
    "chequeos detallados en el presente informe y verificando el cumplimiento de los",
    "requisitos establecidos para asegurar la calidad e inocuidad de la totalidad del lote.",
  ];
  for (const frase of declaracion) {
    texto(ops, x0 + 10, y, 8, frase, "F3", TEXTO);
    y += 11;
  }
  y += 8;
  ["Nombre", "Firma", "DNI"].forEach((etiqueta, indice) => {
    const xx = x0 + 10 + indice * 172;
    texto(ops, xx, y, 8, etiqueta, "F1", MUTED);
    linea(ops, xx, y + 20, xx + 150, y + 20, BORDE, 0.8);
  });
  y += 28;
  rect(ops, x0, yCierre, ancho, y - yCierre, null, BORDE);

  pie();
  paginas.push(ops);
  publicarPdf(`plan_dosificacion_${solicitud.lote || solicitud.id || "lote"}`, ANCHO, ALTO, paginas, true);
}
