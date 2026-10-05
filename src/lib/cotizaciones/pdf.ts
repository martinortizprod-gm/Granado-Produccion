import { escaparPdf, publicarPdf } from "@/lib/informes/descarga";
import { datosEmision } from "@/lib/informes/emision";
import {
  textoCapacidad,
  textoDinero,
  type FilaProductoCotiz,
} from "@/lib/cotizaciones/logic";
import { nroVisible } from "@/lib/solicitudes/logic";

const ANCHO = 595;
const ALTO = 842;
const VERDE = [61, 122, 86];
const TEXTO = [31, 42, 36];
const MUTED = [92, 107, 99];
const BORDE = [96, 128, 110];
const VERDE_SUAVE = [231, 246, 236];
const CAB_TABLA = [221, 232, 223];
const FILA_ALT = [244, 246, 243];

type Rgb = number[];

function cmd(ops: number[], texto: string) {
  for (let i = 0; i < texto.length; i += 1) ops.push(texto.charCodeAt(i));
}

function rgb(ops: number[], color: Rgb, trazo = false) {
  cmd(
    ops,
    `${(color[0] / 255).toFixed(3)} ${(color[1] / 255).toFixed(3)} ${(color[2] / 255).toFixed(3)} ${trazo ? "RG" : "rg"}\n`,
  );
}

function rect(ops: number[], x: number, yTop: number, w: number, h: number, relleno: Rgb | null, borde: Rgb | null) {
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

function encabezado(ops: number[], cuando: string, usuario: string) {
  const x0 = 34;
  rect(ops, 0, 0, ANCHO, 40, VERDE, null);
  texto(ops, x0, 14, 13, "GRANADO", "F2", [244, 246, 243]);
  linea(ops, 118, 12, 118, 28, [200, 220, 208], 0.6);
  texto(ops, 128, 15, 11, "Cotización", "F1", [244, 246, 243]);
  const usuarioCorto = recortarAncho(usuario, 8, 150);
  texto(ops, ANCHO - 34 - cuando.length * 4.1, 6, 8, cuando, "F1", [244, 246, 243]);
  texto(ops, ANCHO - 34 - usuarioCorto.length * 4.1, 18, 8, usuarioCorto, "F1", [244, 246, 243]);
}

function pie(ops: number[]) {
  const x0 = 34;
  const ancho = 527;
  linea(ops, x0, 812, x0 + ancho, 812, BORDE, 0.9);
  texto(ops, x0, 822, 8, "Calidad en cada paso", "F3", MUTED);
  texto(ops, x0 + ancho - 62, 822, 9, "GRANADO", "F2", VERDE);
}

export function descargarCotizacionPdf(input: {
  fila: FilaProductoCotiz;
  toneladas: number;
  total: number;
  nombreArchivo: string;
}) {
  const { fila, toneladas, total, nombreArchivo } = input;
  const { cuando, usuario } = datosEmision();
  const x0 = 34;
  const ancho = 527;
  const paginas: number[][] = [];
  let ops: number[] = [];

  encabezado(ops, cuando, usuario);
  let y = 52;

  const dato = (dx: number, dy: number, w: number, etiqueta: string, valor: string, tam = 10) => {
    texto(ops, dx, dy, 7, etiqueta, "F1", MUTED);
    texto(ops, dx, dy + 9, tam, recortarAncho(valor || "—", tam, w), "F2", TEXTO);
  };

  const yInfo = y;
  texto(ops, x0 + 10, y + 6, 11, "Datos de la cotización", "F2", TEXTO);
  y += 22;
  dato(x0 + 10, y, 120, "Código", fila.codigo || "—");
  dato(x0 + 150, y, 360, "Producto", fila.producto || "—");
  y += 24;
  linea(ops, x0 + 10, y, x0 + ancho - 10, y, [230, 236, 231], 0.4);
  y += 6;
  dato(x0 + 10, y, 120, "Categoría", fila.categoria || "—");
  dato(x0 + 150, y, 80, "Versión", fila.version ? String(fila.version) : "—");
  dato(x0 + 250, y, 120, "Capacidad", textoCapacidad(fila.capacidad_kg));
  dato(x0 + 390, y, 120, "Toneladas", nroVisible(toneladas, 2));
  y += 24;
  rect(ops, x0, yInfo, ancho, y - yInfo, null, BORDE);

  y += 10;
  let yTabla = y;
  texto(ops, x0 + 10, y + 6, 11, "Composición y costos", "F2", TEXTO);
  y += 22;

  const anchos = [78, 175, 78, 98, 98];
  const titulos = ["Código", "Ingrediente", "Participación", "$/Tn", "Costo $/Tn"];
  const pintarCabeza = () => {
    let xx = x0;
    rect(ops, x0, y, anchos.reduce((s, n) => s + n, 0), 14, CAB_TABLA, null);
    titulos.forEach((titulo, i) => {
      texto(ops, xx + 4, y + 4, 7, titulo, "F2", MUTED);
      xx += anchos[i];
    });
    y += 14;
  };
  pintarCabeza();

  fila.lineas.forEach((lineaItem, indice) => {
    if (y > 760) {
      rect(ops, x0, yTabla, ancho, y - yTabla, null, BORDE);
      pie(ops);
      paginas.push(ops);
      ops = [];
      encabezado(ops, cuando, usuario);
      y = 52;
      yTabla = y;
      texto(ops, x0 + 10, y + 6, 11, "Composición y costos (cont.)", "F2", TEXTO);
      y += 22;
      pintarCabeza();
    }
    if (indice % 2 === 1) rect(ops, x0, y, anchos.reduce((s, n) => s + n, 0), 13, FILA_ALT, null);
    const celdas = [
      lineaItem.codigo || "—",
      lineaItem.nombre || "—",
      `${nroVisible(lineaItem.participacion_pct, 2)} %`,
      textoDinero(lineaItem.costo_ingrediente_tn),
      textoDinero(lineaItem.costo_linea_tn),
    ];
    let cx = x0;
    celdas.forEach((valor, i) => {
      texto(ops, cx + 4, y + 3, 7, recortarAncho(valor, 7, anchos[i] - 8), "F1", TEXTO);
      cx += anchos[i];
    });
    y += 13;
  });

  const resumen: [string, string, boolean][] = [
    ["Costo materias primas", textoDinero(fila.costo_mp_tn), false],
    [`Fazón (${textoCapacidad(fila.capacidad_kg)})`, textoDinero(fila.costo_fazon_tn), false],
    ["Costo $/Tn", textoDinero(fila.costo_tn), false],
    [`Cotización total (${nroVisible(toneladas, 2)} Tn)`, textoDinero(total), true],
  ];
  for (const [etiqueta, valor, destacado] of resumen) {
    const alto = destacado ? 18 : 14;
    rect(ops, x0, y, ancho, alto, destacado ? VERDE : VERDE_SUAVE, null);
    const color = destacado ? [244, 246, 243] : TEXTO;
    texto(ops, x0 + 8, y + (destacado ? 5 : 3), destacado ? 9 : 8, etiqueta, "F2", color);
    texto(
      ops,
      x0 + ancho - 8 - valor.length * (destacado ? 5.1 : 4.4),
      y + (destacado ? 5 : 3),
      destacado ? 9 : 8,
      valor,
      "F2",
      color,
    );
    y += alto;
  }

  rect(ops, x0, yTabla, ancho, y - yTabla, null, BORDE);
  pie(ops);
  paginas.push(ops);
  publicarPdf(nombreArchivo, ANCHO, ALTO, paginas, true);
}
