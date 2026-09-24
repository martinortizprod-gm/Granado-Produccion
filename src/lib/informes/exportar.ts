import { lineaEmision } from "@/lib/informes/emision";
import {
  nombreArchivoLote,
  type ConsumoVsReceta,
  type HojaLote,
  type SolicitudesVsProducido,
} from "@/lib/informes/logic";
import { fmtHs, fmtKg, fmtPct } from "@/lib/analytics/logic";
import { nroDec } from "@/lib/produccion/logic";
import { fechaVisible, nroVisible } from "@/lib/solicitudes/logic";

export type InformeFicha = {
  titulo: string;
  nombreInicial: string;
  hoja: string;
  encabezados: string[];
  filas: (string | number | null)[][];
  filasPdf: (string | number | null)[][];
};

type Fila = (string | number | null)[];

function fila(
  seccion: string,
  campo: string,
  valor: string | number | null = "",
  detalle: string | number | null = "",
  extra: string | number | null = "",
): Fila {
  return [seccion, campo, valor, detalle, extra];
}

const ENC_SECCION = ["Sección", "Campo", "Valor", "Detalle", "Extra"];

export function armarInformeHojaLote(hoja: HojaLote): InformeFicha {
  const s = hoja.solicitud;
  const filas: Fila[] = [
    fila("Solicitud", "Lote", s.lote),
    fila("Solicitud", "Producto", s.producto, s.codigo_producto),
    fila("Solicitud", "Categoría", s.categoria || "—"),
    fila("Solicitud", "Versión", s.version || "—"),
    fila("Solicitud", "O. compra", s.orden_compra || "—"),
    fila("Solicitud", "O. producción", s.orden_produccion || "—"),
    fila("Solicitud", "Fecha registro", fechaVisible(s.fecha_registro)),
    fila("Solicitud", "Fecha estimada", fechaVisible(s.fecha_estimada)),
    fila("Solicitud", "Estado", s.estado_etiqueta),
    fila("Solicitud", "Kg solicitados", s.kg_solicitados, fmtKg(s.kg_solicitados)),
    fila("Solicitud", "Kg producidos", hoja.kgProducidos, fmtKg(hoja.kgProducidos), s.fuente_cargado),
    fila("Solicitud", "Pallets", s.pallets_cargados, `de ${nroVisible(s.pallets_solicitados)}`),
    fila("Solicitud", "Unidades", s.unidades_cargadas, `de ${nroVisible(s.unidades_solicitadas)}`),
    fila("Emisión", "Informe", lineaEmision()),
  ];
  for (const jornada of hoja.jornadas) {
    filas.push(
      fila(
        "Jornada",
        fechaVisible(jornada.fecha),
        jornada.kg,
        `${nroVisible(jornada.pallets)} pal · ${nroVisible(jornada.unidades)} un`,
        `${fmtHs(jornada.hsDisponibles)} disp. · ${fmtHs(jornada.hsProductivas)} prod. · ${fmtHs(jornada.hsParadasProg)} prog. · ${fmtHs(jornada.hsParadasNo)} no prog.`,
      ),
    );
    for (const consumo of jornada.consumos) {
      const rango =
        consumo.palletInicio != null || consumo.palletFin != null
          ? `Pallets ${consumo.palletInicio ?? "—"}–${consumo.palletFin ?? "—"}`
          : "";
      filas.push(fila("Consumo", consumo.ingrediente, consumo.cantidad, consumo.lote, rango));
    }
  }
  for (const parada of hoja.paradas) {
    filas.push(
      fila(
        "Parada",
        parada.causa,
        fechaVisible(parada.fecha),
        `Hs progr. ${parada.hsProg > 0 ? fmtHs(parada.hsProg) : "—"}`,
        `Hs no progr. ${parada.hsNo > 0 ? fmtHs(parada.hsNo) : "—"}${parada.descripcion ? ` · ${parada.descripcion}` : ""}`,
      ),
    );
  }
  for (const resp of hoja.responsables) {
    filas.push(fila("Responsable", resp.rol, resp.nombre));
  }
  for (const barrido of hoja.barridos) {
    filas.push(fila("Barrido", barrido.ingrediente, barrido.pesaje));
  }
  for (const item of hoja.limpieza) {
    filas.push(fila("Limpieza", item.equipo));
  }
  return {
    titulo: `Hoja de lote · ${s.lote || s.id}`,
    nombreInicial: nombreArchivoLote("hoja_lote", s.lote || String(s.id ?? "")),
    hoja: "Lote",
    encabezados: ENC_SECCION,
    filas,
    filasPdf: filas,
  };
}

export function armarInformeConsumoReceta(vista: ConsumoVsReceta): InformeFicha {
  const s = vista.solicitud;
  const encabezados = [
    "Ingrediente",
    "Código",
    "Tipo",
    "Participación",
    "Teórico kg",
    "Real kg",
    "Diferencia",
    "En receta",
  ];
  const filas: Fila[] = vista.lineas.map((linea) => [
    linea.nombre,
    linea.codigo,
    linea.tipo,
    linea.participacion,
    Math.round(linea.teorico * 1000) / 1000,
    Math.round(linea.real * 1000) / 1000,
    Math.round(linea.diferencia * 1000) / 1000,
    linea.enReceta ? "Sí" : "No",
  ]);
  filas.unshift([
    "Totales",
    "",
    "",
    "",
    Math.round(vista.teoricoTotal * 1000) / 1000,
    Math.round(vista.realTotal * 1000) / 1000,
    Math.round((vista.realTotal - vista.teoricoTotal) * 1000) / 1000,
    "",
  ]);
  filas.unshift([
    `Lote ${s.lote || s.id}`,
    s.producto,
    `Versión ${s.version || "—"}`,
    fmtKg(vista.kgProducidos),
    lineaEmision(),
    "",
    "",
    "",
  ]);
  const filasPdf = filas.map((item, i) => {
    if (i === 0) return item;
    return [
      item[0],
      item[1],
      item[2],
      i === 1 ? item[3] : item[3] == null || item[3] === "" ? "" : nroVisible(Number(item[3]), 4),
      item[4] == null || item[4] === "" ? "" : nroVisible(Number(item[4]), 2),
      item[5] == null || item[5] === "" ? "" : nroVisible(Number(item[5]), 2),
      item[6] == null || item[6] === "" ? "" : nroDec(Number(item[6]), 2),
      item[7],
    ];
  });
  return {
    titulo: `Consumo vs receta · ${s.lote || s.id}`,
    nombreInicial: nombreArchivoLote("consumo_receta", s.lote || String(s.id ?? "")),
    hoja: "Consumo",
    encabezados,
    filas,
    filasPdf,
  };
}

export function armarInformeSolicitudesVs(
  vista: SolicitudesVsProducido,
  desde: string,
  hasta: string,
): InformeFicha {
  const encabezados = [
    "Lote",
    "Producto",
    "O. compra",
    "O. producción",
    "Fecha",
    "Kg solicitados",
    "Kg producidos",
    "Diferencia",
    "Cumplimiento",
    "Estado",
    "Fuente",
  ];
  const filas: Fila[] = vista.filas.map((item) => [
    item.lote,
    item.producto,
    item.ordenCompra,
    item.ordenProduccion,
    fechaVisible(item.fecha),
    Math.round(item.kgSolicitados * 100) / 100,
    Math.round(item.kgProducidos * 100) / 100,
    Math.round(item.diferencia * 100) / 100,
    item.cumplimiento == null ? "" : Math.round(item.cumplimiento * 10) / 10,
    item.estadoEtiqueta,
    item.fuente === "produccion" ? "Producción" : "Solicitud",
  ]);
  const filasPdf = [
    ["Período", `${fechaVisible(desde)} — ${fechaVisible(hasta)}`, lineaEmision(), "", "", "", "", "", "", "", ""],
    [
      "Totales",
      `${vista.filas.length} solicitudes`,
      `${vista.conProduccion} con producción`,
      "",
      "",
      fmtKg(vista.kgSolicitados),
      fmtKg(vista.kgProducidos),
      fmtKg(vista.kgProducidos - vista.kgSolicitados),
      vista.kgSolicitados > 0.01 ? fmtPct((vista.kgProducidos / vista.kgSolicitados) * 100) : "—",
      "",
      "",
    ],
    ...filas.map((item) => [
      item[0],
      item[1],
      item[2],
      item[3],
      item[4],
      item[5] == null || item[5] === "" ? "" : nroVisible(Number(item[5]), 1),
      item[6] == null || item[6] === "" ? "" : nroVisible(Number(item[6]), 1),
      item[7] == null || item[7] === "" ? "" : nroDec(Number(item[7]), 1),
      item[8] == null || item[8] === "" ? "" : fmtPct(Number(item[8])),
      item[9],
      item[10],
    ]),
  ];
  return {
    titulo: "Solicitudes vs producido",
    nombreInicial: `solicitudes_vs_producido_${desde}_${hasta}`,
    hoja: "Comparativo",
    encabezados,
    filas,
    filasPdf,
  };
}
