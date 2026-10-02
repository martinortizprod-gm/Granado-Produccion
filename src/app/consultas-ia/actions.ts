"use server";

import { requirePermiso } from "@/lib/auth/permisos";
import {
  armarArticulos,
  armarConsumos,
  armarIngredientes,
  resumenLocal,
  sumarConsumo,
  tablaConsumo,
} from "@/lib/consultas-ia/consumo";
import { cargarConsultaIa, cargarConsumoIa, cargarLotesIa } from "@/lib/consultas-ia/datos";
import { cualLote, listarLotes, resumenLotes, tablaLotes } from "@/lib/consultas-ia/lotes";
import { esOperacion, resolverOperacion } from "@/lib/consultas-ia/operacion";
import {
  claveGemini,
  llamarGemini,
  leerRespuestaGemini,
  pedidoInterpretar,
  pedidoRedactar,
} from "@/lib/consultas-ia/gemini";
import type { ResultadoConsultaIa } from "@/lib/consultas-ia/tipos";

export type { ResultadoConsultaIa } from "@/lib/consultas-ia/tipos";

export type RespuestaConsultaIa =
  | { ok: true; resultado: ResultadoConsultaIa }
  | { ok: false; error: string };

function textoArg(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function listaIngredientes(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const lista: string[] = [];
  for (const item of valor) {
    const nombre = textoArg(item);
    if (!nombre || nombre.length > 80) continue;
    if (!lista.some((existente) => existente.toLowerCase() === nombre.toLowerCase())) {
      lista.push(nombre);
    }
    if (lista.length >= 6) break;
  }
  return lista;
}

async function redactar(base: string, datos: unknown) {
  try {
    const redactado = leerRespuestaGemini(await llamarGemini(pedidoRedactar(JSON.stringify(datos))));
    if (redactado.texto) return { resumen: redactado.texto, redactoIa: true };
  } catch {
    // Si Gemini no redacta, queda el texto calculado por el sistema.
  }
  return { resumen: base, redactoIa: false };
}

function fechaIso(valor: unknown): string | null {
  const texto = textoArg(valor);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

export async function claveGeminiLista() {
  await requirePermiso("consultas-ia", "ver");
  return Boolean(claveGemini());
}

export async function consultarConsumo(pregunta: string): Promise<RespuestaConsultaIa> {
  try {
    await requirePermiso("consultas-ia", "leer");
    if (!claveGemini()) {
      return { ok: false, error: "Falta GEMINI_API_KEY en .env.local." };
    }

    const preguntaTexto = pregunta.trim();
    if (!preguntaTexto) return { ok: false, error: "Escribí una pregunta." };
    if (preguntaTexto.length > 800) return { ok: false, error: "La pregunta es demasiado larga." };

    const hoy = new Date().toISOString().slice(0, 10);
    const interpretado = leerRespuestaGemini(
      await llamarGemini(pedidoInterpretar(preguntaTexto, hoy)),
    );
    const llamada = interpretado.llamada;
    if (!llamada) {
      return {
        ok: false,
        error: "Gemini no indicó una consulta. Probá de nuevo con ingredientes y un período.",
      };
    }
    if (llamada.name === "consulta_no_soportada") {
      const motivo = textoArg(llamada.args.motivo);
      return {
        ok: false,
        error:
          motivo ||
          "Por ahora esta pantalla responde stock, movimientos, consumos, producción, planificación, tiempos, paradas, solicitudes y lotes.",
      };
    }

    const sinPeriodoObligatorio =
      llamada.name === "solicitudes" || llamada.name === "produccion_pendiente";
    const desde = fechaIso(llamada.args.desde) ?? "";
    const hasta = fechaIso(llamada.args.hasta) ?? "";
    const pidioPeriodo = Boolean(desde || hasta);
    if (!sinPeriodoObligatorio || pidioPeriodo) {
      if (!desde || !hasta || desde > hasta) {
        return { ok: false, error: "No se pudo armar el período. Reformulá la pregunta." };
      }
      const dias =
        (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000;
      if (dias > 366) {
        return { ok: false, error: "El período no puede superar un año." };
      }
    }

    if (esOperacion(llamada.name)) {
      const tabla = resolverOperacion(llamada.name, llamada.args, await cargarConsultaIa(), desde, hasta);
      if ("error" in tabla) return { ok: false, error: tabla.error };
      const redaccion = await redactar(tabla.resumen, {
        desde,
        hasta,
        fuente: tabla.fuente,
        columnas: tabla.columnas,
        filas: tabla.filas.slice(0, 8),
      });
      return {
        ok: true,
        resultado: {
          resumen: redaccion.resumen,
          desde,
          hasta,
          fuente: tabla.fuente,
          redactoIa: redaccion.redactoIa,
          columnas: tabla.columnas,
          filas: tabla.filas,
          barras: tabla.barras,
        },
      };
    }

    if (llamada.name === "lotes_produccion") {
      const cual = cualLote(llamada.args.cual);
      if (!cual) {
        return { ok: false, error: "No quedó claro si buscás el primer lote, el último o todos." };
      }
      const crudo = await cargarLotesIa();
      const filas = listarLotes({
        cual,
        desde,
        hasta,
        producciones: crudo.producciones,
        solicitudes: crudo.solicitudes,
        productos: crudo.productos,
      });
      const tabla = tablaLotes(filas);
      const redaccion = await redactar(resumenLotes(filas, cual, desde, hasta), {
        desde,
        hasta,
        cual,
        filas,
      });
      return {
        ok: true,
        resultado: {
          resumen: redaccion.resumen,
          desde,
          hasta,
          fuente: "Jornadas de Producción. La fecha es la de la jornada, no la de la solicitud.",
          redactoIa: redaccion.redactoIa,
          columnas: tabla.columnas,
          filas: tabla.filas,
        },
      };
    }

    if (llamada.name !== "consumo_ingredientes") {
      return { ok: false, error: "Gemini pidió una consulta que esta pantalla no tiene." };
    }

    const pedidos = listaIngredientes(llamada.args.ingredientes);
    const crudo = await cargarConsumoIa();
    const filas = sumarConsumo({
      pedidos,
      desde,
      hasta,
      ingredientes: armarIngredientes(crudo.ingredientes),
      articulos: armarArticulos(crudo.articulos),
      consumos: armarConsumos(crudo.consumos),
    });
    const tabla = tablaConsumo(filas);
    const redaccion = await redactar(resumenLocal(filas, desde, hasta), {
      desde,
      hasta,
      fuente: "consumo de producción",
      filas: filas.map((fila) => ({
        pedido: fila.pedido,
        codigo: fila.codigo,
        nombre: fila.nombre,
        cantidad: fila.cantidad,
        unidad: fila.unidad,
        registros: fila.registros,
        encontrado: fila.estado === "ok",
      })),
    });

    return {
      ok: true,
      resultado: {
        resumen: redaccion.resumen,
        desde,
        hasta,
        fuente: "Consumo de las jornadas de producción (tabla consumo). No incluye movimientos de stock.",
        redactoIa: redaccion.redactoIa,
        columnas: tabla.columnas,
        filas: tabla.filas,
      },
    };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo consultar.";
    if (mensaje === "Sin permiso") return { ok: false, error: "No tenés permiso de lectura en Consultas IA." };
    if (mensaje.includes("The operation was aborted")) {
      return { ok: false, error: "Gemini tardó demasiado. Probá de nuevo." };
    }
    return { ok: false, error: mensaje };
  }
}
