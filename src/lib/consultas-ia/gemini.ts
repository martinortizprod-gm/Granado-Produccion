const MODELO_DEFECTO = "gemini-3.5-flash-lite";
const MODELOS_RESPALDO = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"];

export function claveGemini(): string | null {
  const clave = process.env.GEMINI_API_KEY?.trim() ?? "";
  return clave || null;
}

export function modeloGemini(): string {
  const modelo = process.env.GEMINI_MODEL?.trim() || MODELO_DEFECTO;
  if (!/^[a-zA-Z0-9._-]+$/.test(modelo)) return MODELO_DEFECTO;
  return modelo;
}

function modelosAProbar(): string[] {
  const preferido = modeloGemini();
  return [preferido, ...MODELOS_RESPALDO.filter((item) => item !== preferido)];
}

function falloReintentable(status: number, mensaje: string): boolean {
  const texto = mensaje.toLowerCase();
  if (status === 429 || status === 500 || status === 503 || status === 404) return true;
  return (
    texto.includes("high demand") ||
    texto.includes("try again") ||
    texto.includes("overloaded") ||
    texto.includes("unavailable") ||
    texto.includes("no longer available") ||
    texto.includes("not found") ||
    texto.includes("not supported")
  );
}

type Llamada = {
  name: string;
  args: Record<string, unknown>;
};

type RespuestaModelo = {
  llamada: Llamada | null;
  texto: string;
};

function partes(json: Record<string, unknown>): Record<string, unknown>[] {
  const candidates = json.candidates;
  if (!Array.isArray(candidates) || !candidates.length) return [];
  const content = (candidates[0] as Record<string, unknown>)?.content as
    | Record<string, unknown>
    | undefined;
  const lista = content?.parts;
  return Array.isArray(lista) ? (lista as Record<string, unknown>[]) : [];
}

export function leerRespuestaGemini(json: Record<string, unknown>): RespuestaModelo {
  const bloqueo = json.promptFeedback as Record<string, unknown> | undefined;
  if (bloqueo?.blockReason) {
    throw new Error("Gemini bloqueó la consulta. Reformulá la pregunta.");
  }
  let llamada: Llamada | null = null;
  const textos: string[] = [];
  for (const part of partes(json)) {
    const call = part.functionCall as Record<string, unknown> | undefined;
    if (call?.name && !llamada) {
      const args = call.args;
      llamada = {
        name: String(call.name),
        args: args && typeof args === "object" ? (args as Record<string, unknown>) : {},
      };
    }
    if (typeof part.text === "string" && part.text.trim()) textos.push(part.text.trim());
  }
  return { llamada, texto: textos.join("\n") };
}

async function generarConModelo(
  clave: string,
  modelo: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": clave,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    },
  );
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  if (!res.ok) {
    const error = json.error as Record<string, unknown> | undefined;
    const mensaje = typeof error?.message === "string" ? error.message : `Gemini respondió ${res.status}.`;
    const fallo = new Error(mensaje) as Error & { reintentar?: boolean };
    fallo.reintentar = falloReintentable(res.status, mensaje);
    throw fallo;
  }
  return json;
}

export async function llamarGemini(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const clave = claveGemini();
  if (!clave) {
    throw new Error("Falta GEMINI_API_KEY en .env.local.");
  }
  let ultimo = "Gemini está con mucha demanda. Esperá un minuto y volvé a consultar.";
  for (const modelo of modelosAProbar()) {
    try {
      return await generarConModelo(clave, modelo, body);
    } catch (error) {
      const fallo = error as Error & { reintentar?: boolean };
      if (fallo.message?.includes("The operation was aborted")) {
        ultimo = "Gemini tardó demasiado. Probá de nuevo.";
        continue;
      }
      if (!fallo.reintentar) throw error;
      ultimo = "Gemini está con mucha demanda. Esperá un minuto y volvé a consultar.";
    }
  }
  throw new Error(ultimo);
}

const HERRAMIENTAS = [
  {
    functionDeclarations: [
      {
        name: "consumo_ingredientes",
        description:
          "Suma el consumo de ingredientes en las jornadas de producción, entre dos fechas inclusive. No calcula movimientos de stock.",
        parameters: {
          type: "OBJECT",
          properties: {
            ingredientes: {
              type: "ARRAY",
              description:
                "Nombres o códigos tal como los escribió la persona. Lista vacía si pide todos los ingredientes del período.",
              items: { type: "STRING" },
            },
            desde: { type: "STRING", description: "Inicio inclusive, formato YYYY-MM-DD." },
            hasta: { type: "STRING", description: "Fin inclusive, formato YYYY-MM-DD." },
          },
          required: ["ingredientes", "desde", "hasta"],
        },
      },
      {
        name: "lotes_produccion",
        description:
          "Lotes elaborados en jornadas de producción entre dos fechas. La fecha es la de la jornada, no la de la solicitud.",
        parameters: {
          type: "OBJECT",
          properties: {
            desde: { type: "STRING", description: "Inicio inclusive, formato YYYY-MM-DD." },
            hasta: { type: "STRING", description: "Fin inclusive, formato YYYY-MM-DD." },
            cual: {
              type: "STRING",
              description: "primero, ultimo o todos.",
            },
          },
          required: ["desde", "hasta", "cual"],
        },
      },
      {
        name: "stock_articulos",
        description:
          "Stock acumulado hasta una fecha de ingredientes, insumos, envases, etiquetas o productos. No es el movimiento del período: es el saldo al día hasta.",
        parameters: {
          type: "OBJECT",
          properties: {
            familia: {
              type: "STRING",
              description: "ingredientes, insumos, envases, etiquetas, productos o todas.",
            },
            nombres: {
              type: "ARRAY",
              description: "Nombres o códigos. Lista vacía si pide todos.",
              items: { type: "STRING" },
            },
            desde: { type: "STRING", description: "YYYY-MM-DD. Si piden un solo día, igual a hasta." },
            hasta: { type: "STRING", description: "YYYY-MM-DD. El stock se calcula hasta este día inclusive." },
          },
          required: ["familia", "nombres", "desde", "hasta"],
        },
      },
      {
        name: "movimientos_articulos",
        description: "Ingresos y egresos de una familia entre dos fechas. No es el stock.",
        parameters: {
          type: "OBJECT",
          properties: {
            familia: { type: "STRING", description: "ingredientes, insumos, envases, etiquetas, productos o todas." },
            nombres: { type: "ARRAY", items: { type: "STRING" }, description: "Vacío si pide todos." },
            desde: { type: "STRING", description: "YYYY-MM-DD." },
            hasta: { type: "STRING", description: "YYYY-MM-DD." },
          },
          required: ["familia", "nombres", "desde", "hasta"],
        },
      },
      {
        name: "consumos_articulos",
        description:
          "Consumo en producción de ingredientes, insumos, envases o etiquetas. Si la familia es productos, devuelve kilos elaborados.",
        parameters: {
          type: "OBJECT",
          properties: {
            familia: { type: "STRING", description: "ingredientes, insumos, envases, etiquetas, productos o todas." },
            nombres: { type: "ARRAY", items: { type: "STRING" }, description: "Vacío si pide todos." },
            desde: { type: "STRING", description: "YYYY-MM-DD." },
            hasta: { type: "STRING", description: "YYYY-MM-DD." },
          },
          required: ["familia", "nombres", "desde", "hasta"],
        },
      },
      {
        name: "produccion_resumen",
        description:
          "Kilos producidos en un período. Si piden un gráfico, usá esta función igual: el sistema dibuja las barras. No la rechaces.",
        parameters: {
          type: "OBJECT",
          properties: {
            agrupar: {
              type: "STRING",
              description: "total, producto, lote, categoria, dia o presentacion. presentacion es producto más envase (bolsa, big bag y kilos).",
            },
            nombres: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Presentaciones o productos pedidos, tal como los escribió. Vacío si pide todos.",
            },
            grafico: { type: "BOOLEAN", description: "true si pidió un gráfico o barras." },
            desde: { type: "STRING", description: "YYYY-MM-DD." },
            hasta: { type: "STRING", description: "YYYY-MM-DD." },
          },
          required: ["agrupar", "desde", "hasta"],
        },
      },
      {
        name: "planificacion",
        description: "Kilos planificados por categoría en un período, comparados con los kilos reales.",
        parameters: {
          type: "OBJECT",
          properties: {
            desde: { type: "STRING", description: "YYYY-MM-DD." },
            hasta: { type: "STRING", description: "YYYY-MM-DD." },
          },
          required: ["desde", "hasta"],
        },
      },
      {
        name: "tiempos_produccion",
        description: "Horas disponibles, productivas y de paradas de las jornadas de un período.",
        parameters: {
          type: "OBJECT",
          properties: {
            desde: { type: "STRING", description: "YYYY-MM-DD." },
            hasta: { type: "STRING", description: "YYYY-MM-DD." },
          },
          required: ["desde", "hasta"],
        },
      },
      {
        name: "causas_paradas",
        description: "Horas de parada agrupadas por causa, programadas o no.",
        parameters: {
          type: "OBJECT",
          properties: {
            tipo: { type: "STRING", description: "programadas, no_programadas o todas." },
            desde: { type: "STRING", description: "YYYY-MM-DD." },
            hasta: { type: "STRING", description: "YYYY-MM-DD." },
          },
          required: ["tipo", "desde", "hasta"],
        },
      },
      {
        name: "solicitudes",
        description:
          "Estado de las solicitudes. Pendiente = sin iniciar. En producción = iniciada y sin finalizar. Completada = finalizada. Cancelada = marcada. No uses esta función para los kilos que faltan.",
        parameters: {
          type: "OBJECT",
          properties: {
            estado: {
              type: "STRING",
              description: "pendiente, en_produccion, completada, cancelada o todas.",
            },
            nombre: { type: "STRING", description: "Filtro opcional de producto, lote o cliente. Vacío si no hay." },
            desde: { type: "STRING", description: "YYYY-MM-DD. Vacío si no nombraron un período." },
            hasta: { type: "STRING", description: "YYYY-MM-DD. Vacío si no nombraron un período." },
          },
          required: ["estado"],
        },
      },
      {
        name: "produccion_pendiente",
        description:
          "Kilos que faltan elaborar. Pedido de 5000 kg con 2000 producidos = 3000 pendientes. No es el estado pendiente de la solicitud.",
        parameters: {
          type: "OBJECT",
          properties: {
            nombre: { type: "STRING", description: "Filtro opcional de producto o lote. Vacío si pide todas." },
            desde: { type: "STRING", description: "YYYY-MM-DD. Vacío si no nombraron un período." },
            hasta: { type: "STRING", description: "YYYY-MM-DD. Vacío si no nombraron un período." },
          },
        },
      },
      {
        name: "consulta_no_soportada",
        description:
          "Solo si la pregunta no es stock, movimientos, consumos, producción, planificación, tiempos, paradas, solicitudes ni lotes. Un gráfico de esos datos no va acá.",
        parameters: {
          type: "OBJECT",
          properties: {
            motivo: {
              type: "STRING",
              description: "Una frase en español diciendo qué sí se puede preguntar.",
            },
          },
          required: ["motivo"],
        },
      },
    ],
  },
];

export function pedidoInterpretar(pregunta: string, hoy: string) {
  return {
    systemInstruction: {
      parts: [
        {
          text: [
            "Interpretás preguntas de una planta de alimentos para bovinos.",
            `Hoy es ${hoy}.`,
            "Si nombran un mes sin año, usá el año de hoy cuando ese mes ya ocurrió o es el mes actual. Si el mes todavía no llegó este año, usá el año anterior.",
            "No calcules cantidades. Si nombran un período, mandá desde y hasta en YYYY-MM-DD.",
            "Mes actual: desde el día 1 de hoy hasta hoy. Un mes nombrado: del 1 al último día de ese mes.",
            "Stock en una fecha o al cierre de un período: stock_articulos. El saldo es hasta el día hasta.",
            "Ingresos y egresos: movimientos_articulos.",
            "Cuánto se consumió en producción: consumos_articulos. Si no nombran artículos, nombres va vacío. Ingredientes también puede ir a consumo_ingredientes.",
            "Kilos producidos por producto, lote, categoría, día o presentación (bolsa, big bag): produccion_resumen.",
            "Si piden un gráfico o barras, llamá igual a la consulta de datos y poné grafico en true. No digas que no podés graficar.",
            "Primer o último lote, o el listado de lotes: lotes_produccion.",
            "Plan o kilos estimados: planificacion.",
            "Horas disponibles, productivas o paradas: tiempos_produccion.",
            "Por qué se paró o causas de las horas paradas: causas_paradas.",
            "Solicitudes pendientes significa sin iniciar: solicitudes con estado pendiente.",
            "Solicitud en producción significa iniciada y sin finalizar: solicitudes con estado en_produccion.",
            "Solicitud completada significa finalizada. Solicitud cancelada significa marcada como cancelada.",
            "Producción, sin la palabra pendiente, son las jornadas ya registradas: produccion_resumen.",
            "Producción pendiente son los kilos que faltan elaborar: produccion_pendiente. No la confundas con solicitudes pendientes.",
            "Si preguntan el estado actual o la producción pendiente y no nombran un período, dejá desde y hasta vacíos.",
            "Costos, usuarios o modificar datos: consulta_no_soportada.",
          ].join(" "),
        },
      ],
    },
    contents: [{ role: "user", parts: [{ text: pregunta }] }],
    tools: HERRAMIENTAS,
    toolConfig: { functionCallingConfig: { mode: "ANY" } },
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
    },
  };
}

export function pedidoRedactar(datos: string) {
  return {
    systemInstruction: {
      parts: [
        {
          text: "Redactá una o dos frases en español, solo con los datos que te pasan. No inventes cifras ni nombres. Si hay más de cuatro filas, no las enumeres: decí cuántas hay y mencioná solo la primera.",
        },
      ],
    },
    contents: [{ role: "user", parts: [{ text: datos }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  };
}
