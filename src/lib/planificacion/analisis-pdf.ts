import { escaparPdf, publicarPdf } from "@/lib/informes/descarga";
import { datosEmision } from "@/lib/informes/emision";
import { etiquetaMes, type AnalisisHoras, type DatosPlan, type ParteHoras } from "@/lib/planificacion/logic";

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
const PISTA = [221, 232, 223];

const BARRAS = [
  [61, 122, 86],
  [47, 111, 237],
  [240, 160, 75],
  [196, 163, 90],
];
const TORTA = [
  [47, 111, 237],
  [240, 160, 75],
  [61, 122, 86],
  [138, 171, 150],
  [61, 107, 138],
  [184, 92, 92],
  [196, 123, 43],
];
const GANTT = [
  [61, 122, 86],
  [47, 111, 237],
  [240, 160, 75],
  [138, 171, 150],
  [61, 107, 138],
  [196, 123, 43],
  [184, 92, 92],
  [107, 143, 113],
];

type Rgb = number[];

function nro(valor: number, decimales = 1) {
  const n = Number(valor) || 0;
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n).toLocaleString("es-AR");
  return n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

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
  cmd(ops, `${grosor} w\n${x1.toFixed(1)} ${(ALTO - y1).toFixed(1)} m ${x2.toFixed(1)} ${(ALTO - y2).toFixed(1)} l S\n`);
}

function texto(ops: number[], x: number, yTop: number, size: number, valor: string, fuente: "F1" | "F2" | "F3", color: Rgb) {
  rgb(ops, color);
  const y = ALTO - yTop - size;
  cmd(ops, `BT /${fuente} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (`);
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

function textoCentro(ops: number[], x: number, w: number, y: number, size: number, valor: string, fuente: "F1" | "F2", color: Rgb) {
  const usado = anchoTexto(valor, size);
  texto(ops, x + Math.max(2, (w - usado) / 2), y, size, valor, fuente, color);
}

function punto(cx: number, cy: number, r: number, theta: number) {
  return { x: cx + r * Math.sin(theta), y: cy + r * Math.cos(theta) };
}

function curvas(ops: number[], cx: number, cy: number, r: number, desde: number, hasta: number, mover: boolean) {
  const sentido = hasta >= desde ? 1 : -1;
  let t = desde;
  if (mover) {
    const p = punto(cx, cy, r, t);
    cmd(ops, `${p.x.toFixed(2)} ${p.y.toFixed(2)} m\n`);
  }
  while ((sentido > 0 && t < hasta - 1e-4) || (sentido < 0 && t > hasta + 1e-4)) {
    const paso = Math.min(Math.PI / 2, Math.abs(hasta - t));
    const t2 = t + sentido * paso;
    const alpha = (4 / 3) * Math.tan((t2 - t) / 4);
    const p0 = punto(cx, cy, r, t);
    const p3 = punto(cx, cy, r, t2);
    const tangente = (th: number) => ({ x: Math.cos(th), y: -Math.sin(th) });
    const a = tangente(t);
    const b = tangente(t2);
    const p1x = p0.x + alpha * r * a.x;
    const p1y = p0.y + alpha * r * a.y;
    const p2x = p3.x - alpha * r * b.x;
    const p2y = p3.y - alpha * r * b.y;
    cmd(ops, `${p1x.toFixed(2)} ${p1y.toFixed(2)} ${p2x.toFixed(2)} ${p2y.toFixed(2)} ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} c\n`);
    t = t2;
  }
}

function anillo(ops: number[], cx: number, cy: number, radio: number, grosor: number, desde: number, hasta: number, color: Rgb) {
  const externo = radio;
  const interno = Math.max(4, radio - grosor);
  rgb(ops, color);
  const span = hasta - desde;
  if (span >= Math.PI * 2 - 0.02) {
    curvas(ops, cx, cy, externo, 0, Math.PI * 2, true);
    curvas(ops, cx, cy, interno, 0, Math.PI * 2, true);
    cmd(ops, "f*\n");
    return;
  }
  curvas(ops, cx, cy, externo, desde, hasta, true);
  const internoFin = punto(cx, cy, interno, hasta);
  cmd(ops, `${internoFin.x.toFixed(2)} ${internoFin.y.toFixed(2)} l\n`);
  curvas(ops, cx, cy, interno, hasta, desde, false);
  cmd(ops, "h\nf\n");
}

function causasDelGantt(analisis: AnalisisHoras) {
  const totales = new Map<string, number>();
  for (const evento of analisis.eventos) totales.set(evento.causa, (totales.get(evento.causa) ?? 0) + evento.horas);
  return [...totales.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).map(([causa]) => causa);
}

function horasCausaMes(analisis: AnalisisHoras, causa: string, mes: string) {
  const ym = mes.slice(0, 7);
  return analisis.eventos
    .filter((evento) => evento.causa === causa && evento.fecha.slice(0, 7) === ym)
    .reduce((suma, evento) => suma + evento.horas, 0);
}

function encabezado(ops: number[], cuando: string, usuario: string) {
  rect(ops, 0, 0, ANCHO, 40, VERDE, null);
  texto(ops, X0, 14, 13, "GRANADO", "F2", CREMA);
  linea(ops, 118, 12, 118, 28, [200, 220, 208], 0.6);
  texto(ops, 128, 15, 11, "Análisis de horas", "F1", CREMA);
  const usuarioCorto = recortarAncho(usuario, 8, 160);
  texto(ops, ANCHO - 34 - anchoTexto(cuando, 8), 6, 8, cuando, "F1", CREMA);
  texto(ops, ANCHO - 34 - anchoTexto(usuarioCorto, 8), 18, 8, usuarioCorto, "F1", CREMA);
}

function pie(ops: number[], pagina: number) {
  linea(ops, X0, 812, X0 + CAJA, 812, BORDE, 0.9);
  texto(ops, X0, 822, 8, "Calidad en cada paso", "F3", MUTED);
  const pag = `Pág. ${pagina}`;
  texto(ops, X0 + CAJA / 2 - anchoTexto(pag, 8) / 2, 822, 8, pag, "F1", MUTED);
  texto(ops, X0 + CAJA - 62, 822, 9, "GRANADO", "F2", VERDE);
}

function tarjetas(ops: number[], y: number, analisis: AnalisisHoras) {
  const items: { titulo: string; valor: number; color: Rgb }[] = [
    { titulo: "DISPONIBLES", valor: analisis.disponibles, color: BARRAS[0] },
    { titulo: "PRODUCTIVAS", valor: analisis.productivas, color: BARRAS[1] },
    { titulo: "PARADAS PROG.", valor: analisis.paradasProgramadas, color: BARRAS[2] },
    { titulo: "PARADAS NO PROG.", valor: analisis.paradasNoProgramadas, color: TORTA[6] },
    { titulo: "PENDIENTES", valor: analisis.pendientes, color: BARRAS[3] },
  ];
  const gap = 6;
  const ancho = (CAJA - gap * (items.length - 1)) / items.length;
  items.forEach((item, indice) => {
    const x = X0 + indice * (ancho + gap);
    rect(ops, x, y, ancho, 46, null, BORDE);
    texto(ops, x + 6, y + 6, 6, recortarAncho(item.titulo, 6, ancho - 12), "F2", MUTED);
    texto(ops, x + 6, y + 20, 12, `${nro(item.valor, 2)} hs`, "F2", item.color);
  });
  return y + 46;
}

function composicion(ops: number[], y: number, analisis: AnalisisHoras) {
  const filas = analisis.composicion;
  const alto = 28 + filas.length * 18 + 14;
  const y0 = y;
  rect(ops, X0, y, CAJA, alto, null, BORDE);
  texto(ops, X0 + 10, y + 8, 11, "Composición de horas", "F2", TEXTO);
  y += 26;
  const max = Math.max(1, ...filas.map((item) => item.horas));
  const xBarra = X0 + 118;
  const anchoMax = 280;
  filas.forEach((item, indice) => {
    texto(ops, X0 + 8, y + 2, 8, recortarAncho(item.nombre, 8, 104), "F1", TEXTO);
    const ancho = item.horas > 0.0005 ? Math.max(6, (item.horas / max) * anchoMax) : 0;
    if (ancho > 0) rect(ops, xBarra, y, ancho, 11, BARRAS[indice % BARRAS.length], null);
    const leyenda = `${nro(item.horas, 2)} (${nro(item.porcentaje, 1)}%)`;
    texto(ops, xBarra + ancho + 6, y + 2, 8, leyenda, "F1", TEXTO);
    y += 18;
  });
  textoCentro(ops, X0, CAJA, y, 7, "hs", "F1", MUTED);
  return y0 + alto;
}

function rosca(ops: number[], x: number, y: number, w: number, h: number, titulo: string, partes: ParteHoras[]) {
  rect(ops, x, y, w, h, null, BORDE);
  texto(ops, x + 10, y + 8, 10, recortarAncho(titulo, 10, w - 20), "F2", TEXTO);
  const visibles = partes.filter((parte) => parte.horas > 0.0005);
  if (!visibles.length) {
    texto(ops, x + 10, y + 32, 9, "Sin datos", "F3", MUTED);
    return;
  }
  const total = visibles.reduce((suma, parte) => suma + parte.horas, 0) || 1;
  const cx = x + 48;
  const cy = ALTO - (y + 28 + (h - 36) / 2);
  anillo(ops, cx, cy, 32, 12, 0, Math.PI * 2, PISTA);
  let angulo = 0;
  visibles.forEach((parte, indice) => {
    const span = (parte.horas / total) * Math.PI * 2;
    anillo(ops, cx, cy, 32, 12, angulo, angulo + span, TORTA[indice % TORTA.length]);
    angulo += span;
  });
  let ly = y + 28;
  const lx = x + 88;
  visibles.forEach((parte, indice) => {
    rect(ops, lx, ly + 1, 7, 7, TORTA[indice % TORTA.length], null);
    texto(ops, lx + 12, ly, 7, recortarAncho(parte.nombre, 7, w - 108), "F1", TEXTO);
    texto(ops, lx + 12, ly + 9, 7, `${nro(parte.horas, 1)} hs (${nro(parte.porcentaje, 1)}%)`, "F1", MUTED);
    ly += 22;
  });
}

function altoDonas(izquierda: ParteHoras[], derecha: ParteHoras[]) {
  const filas = (partes: ParteHoras[]) => {
    const n = partes.filter((parte) => parte.horas > 0.0005).length;
    return Math.max(78, (n || 1) * 22);
  };
  return 30 + Math.max(filas(izquierda), filas(derecha));
}

export function descargarAnalisisHorasPdf(datos: DatosPlan) {
  const analisis = datos.analisis;
  const { cuando, usuario } = datosEmision();
  const paginas: number[][] = [];
  let ops: number[] = [];
  let y = 52;
  let pagina = 1;

  const abrir = (continuacion: boolean) => {
    ops = [];
    encabezado(ops, cuando, usuario);
    y = 52;
    if (!continuacion) return;
    texto(ops, X0, y, 8, recortarAncho(`Análisis de horas  ·  ${analisis.etiqueta}`, 8, CAJA), "F1", MUTED);
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

  abrir(false);
  texto(ops, X0, y, 12, `ANÁLISIS DE HORAS — ${analisis.etiqueta.toUpperCase()}`, "F2", TEXTO);
  y += 20;
  y = tarjetas(ops, y, analisis) + 10;

  reservar(28 + analisis.composicion.length * 18 + 14);
  y = composicion(ops, y, analisis) + 10;

  const altoDonut = altoDonas(analisis.tipoParadas, analisis.causas);
  reservar(altoDonut);
  const mitad = (CAJA - 8) / 2;
  rosca(ops, X0, y, mitad, altoDonut, "Paradas programadas vs no programadas", analisis.tipoParadas);
  rosca(ops, X0 + mitad + 8, y, mitad, altoDonut, "Causas de paradas no programadas", analisis.causas);
  y += altoDonut + 10;

  const causas = causasDelGantt(analisis);
  const meses = analisis.meses;
  const colNombre = 132;
  const xMeses = X0 + 8 + colNombre;
  const anchoMes = meses.length ? (CAJA - 16 - colNombre) / meses.length : CAJA - 16 - colNombre;
  const altoFila = 18;
  let cajaY = y;

  const cerrarCaja = () => {
    const alto = y - cajaY + 8;
    rect(ops, X0, cajaY, CAJA, alto, null, BORDE);
    y = cajaY + alto;
  };
  const ejeMeses = () => {
    meses.forEach((mes, m) => {
      const x = xMeses + m * anchoMes;
      textoCentro(ops, x, anchoMes, y + 2, 6, recortarAncho(etiquetaMes(mes), 6, anchoMes - 2), "F1", MUTED);
    });
    y += 16;
  };
  const abrirGantt = (titulo: string) => {
    cajaY = y;
    texto(ops, X0 + 10, y + 8, 11, recortarAncho(titulo, 11, CAJA - 20), "F2", TEXTO);
    y += 28;
  };

  if (y + 28 + altoFila + 24 > TOPE) {
    cerrar();
    abrir(true);
  }
  abrirGantt(`Gantt de causas no programadas (${analisis.periodoGantt})`);

  if (!causas.length) {
    texto(ops, X0 + 10, y, 9, "Sin paradas no programadas en el período.", "F3", MUTED);
    y += 16;
  } else {
    causas.forEach((causa, indice) => {
      if (y + altoFila + 24 > TOPE) {
        ejeMeses();
        cerrarCaja();
        cerrar();
        abrir(true);
        abrirGantt("Gantt de causas no programadas (continuación)");
      }
      texto(ops, X0 + 8, y + 3, 7, recortarAncho(causa, 7, colNombre - 8), "F1", TEXTO);
      meses.forEach((mes, m) => {
        const x = xMeses + m * anchoMes;
        linea(ops, x, y - 1, x, y + 14, LINEA, 0.6);
        const horas = horasCausaMes(analisis, causa, mes);
        if (horas > 0.0005) {
          const margen = 3;
          rect(ops, x + margen, y, Math.max(12, anchoMes - margen * 2), 13, GANTT[indice % GANTT.length], null);
          textoCentro(ops, x + margen, anchoMes - margen * 2, y + 3, 7, nro(horas, 1), "F2", [255, 255, 255]);
        }
      });
      y += altoFila;
    });
    ejeMeses();
  }
  cerrarCaja();
  y += 8;
  const nota = `Mes: ${analisis.etiqueta}  ·  Gantt: ${analisis.periodoGantt}  ·  Fuente: planificación mensual, producción y paradas no programadas`;
  if (y + 12 > TOPE) {
    cerrar();
    abrir(true);
  }
  texto(ops, X0, y, 7, recortarAncho(nota, 7, CAJA), "F1", MUTED);

  cerrar();
  publicarPdf(`analisis_horas_${datos.mes.slice(0, 7)}`, ANCHO, ALTO, paginas);
}
