import { puede, type PerfilSesion } from "@/lib/auth/permisos";
import { CATALOGOS, ESTADO_ACTIVO } from "@/lib/catalogos/logic";
import { cargarCatalogo } from "@/lib/catalogos/data";
import { hoyIso } from "@/lib/planificacion/logic";
import { createClient, supabaseEnvConfigured } from "@/lib/supabase/server";
import { cargarDatosSolicitudes } from "@/lib/solicitudes/data";
import {
  ESTADO_COMPLETADA,
  ESTADO_PENDIENTE,
  ESTADO_PRODUCCION,
  aFecha,
  fechaVisible,
  idEntero,
  numero,
  resumenSolicitudes,
  type SolicitudVista,
} from "@/lib/solicitudes/logic";

/** Días hacia adelante para “lotes próximos a vencer”. El stock sale del catálogo. */
const DIAS_PROXIMO_VENCIMIENTO = 30;
const TOPE_ACTIVIDAD = 8;

export type MedidorInicio = {
  id: "pendientes" | "curso" | "kg" | "programadas";
  titulo: string;
  valor: string;
  unidad: string | null;
  detalle: string | null;
  accion: string | null;
  href: string | null;
};

export type FilaActividad = {
  clave: string;
  lote: string;
  producto: string;
  estado: string;
  estadoEtiqueta: string;
  inicio: string;
  fin: string;
  href: string | null;
};

export type AlertaInicio = {
  cantidad: number;
  texto: string;
  href: string;
};

export type AccionInicio = {
  id: "solicitud" | "movimiento" | "produccion" | "plan";
  label: string;
  href: string;
};

export type DashboardInicio = {
  nombre: string;
  saludo: string;
  fecha: string;
  actualizado: string;
  sistemaTono: "ok" | "warning" | "danger";
  sistemaTexto: string;
  errores: string[];
  medidores: MedidorInicio[];
  actividad: {
    filas: FilaActividad[];
    href: string | null;
    vacio: string;
  };
  alertas: AlertaInicio[];
  acciones: AccionInicio[];
};

type EstadoMedidor = "ok" | "sin-permiso" | "error" | "sin-conexion";

function primerNombre(nombre: string | null) {
  const limpio = (nombre || "").trim();
  if (!limpio) return "usuario";
  return limpio.split(/\s+/)[0];
}

function saludoAhora(ahora: Date) {
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(ahora),
  );
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

function horaAhora(ahora: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(ahora);
}

function fechaLarga(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function sumarDias(iso: string, dias: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function cantidadVisible(valor: number) {
  return valor.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}

async function leerColumnas(tabla: string, columnas: string) {
  const supabase = await createClient();
  const page = 1000;
  const all: Record<string, unknown>[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from(tabla)
      .select(columnas)
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}

async function intentar<T>(fn: () => Promise<T>) {
  try {
    return { data: await fn(), error: null as string | null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "No se pudo cargar",
    };
  }
}

function medidor(input: {
  id: MedidorInicio["id"];
  titulo: string;
  accion: string;
  href: string | null;
  puedeVer: boolean;
  estado: EstadoMedidor;
  valor: number | null;
  unidad: string | null;
  detalleOk: string | null;
}): MedidorInicio {
  const ok = input.estado === "ok" && input.valor != null;
  const conAcceso = input.puedeVer && input.estado !== "sin-permiso" && input.href != null;
  const detalle =
    input.estado === "sin-permiso"
      ? "Sin permiso de lectura"
      : input.estado === "error"
        ? "No se pudo cargar"
        : input.estado === "sin-conexion"
          ? "Sin conexión"
          : input.detalleOk;
  return {
    id: input.id,
    titulo: input.titulo,
    valor: ok ? cantidadVisible(input.valor as number) : "—",
    unidad: ok ? input.unidad : null,
    detalle,
    accion: conAcceso ? input.accion : null,
    href: conAcceso ? input.href : null,
  };
}

function hrefFila(perfil: PerfilSesion, solicitud: SolicitudVista) {
  if (solicitud.estado === ESTADO_PRODUCCION && puede(perfil, "produccion", "ver")) {
    return "/produccion";
  }
  if (puede(perfil, "solicitudes", "ver")) return "/solicitudes";
  if (puede(perfil, "produccion", "ver")) return "/produccion";
  return null;
}

function armarActividad(
  perfil: PerfilSesion,
  solicitudes: SolicitudVista[],
  idsProducidosHoy: Set<number>,
  hoy: string,
): FilaActividad[] {
  const filas = solicitudes.filter((item) => {
    const produjoHoy = item.id != null && idsProducidosHoy.has(item.id);
    if (produjoHoy) return true;
    if (item.estado === ESTADO_PRODUCCION) return true;
    if (item.estado === ESTADO_PENDIENTE) {
      return item.fecha_estimada === hoy || item.fecha_registro === hoy;
    }
    if (item.estado === ESTADO_COMPLETADA) return item.fecha_fin === hoy;
    return false;
  });

  const orden: Record<string, number> = {
    [ESTADO_PRODUCCION]: 0,
    [ESTADO_PENDIENTE]: 1,
    [ESTADO_COMPLETADA]: 2,
  };

  filas.sort((a, b) => {
    const produjoA = a.id != null && idsProducidosHoy.has(a.id) ? 0 : 1;
    const produjoB = b.id != null && idsProducidosHoy.has(b.id) ? 0 : 1;
    if (produjoA !== produjoB) return produjoA - produjoB;
    const ea = orden[a.estado] ?? 9;
    const eb = orden[b.estado] ?? 9;
    if (ea !== eb) return ea - eb;
    return (a.lote || a.producto).localeCompare(b.lote || b.producto, "es");
  });

  return filas.slice(0, TOPE_ACTIVIDAD).map((item, indice) => ({
    clave: String(item.id ?? `${item.lote}-${indice}`),
    lote: item.lote || item.orden_produccion || "—",
    producto: item.producto || "Sin producto",
    estado: item.estado,
    estadoEtiqueta: item.estado_etiqueta,
    inicio: fechaVisible(item.fecha_registro),
    fin: fechaVisible(item.fecha_estimada),
    href: hrefFila(perfil, item),
  }));
}

function accionesDe(perfil: PerfilSesion): AccionInicio[] {
  const acciones: AccionInicio[] = [];
  if (puede(perfil, "solicitudes", "editar")) {
    acciones.push({
      id: "solicitud",
      label: "Nueva solicitud",
      href: "/solicitudes/nueva",
    });
  }
  if (puede(perfil, "movimientos", "ver")) {
    acciones.push({
      id: "movimiento",
      label: "Registrar movimiento",
      href: "/movimientos",
    });
  }
  if (puede(perfil, "produccion", "ver")) {
    acciones.push({
      id: "produccion",
      label: "Iniciar producción",
      href: "/produccion",
    });
  }
  if (puede(perfil, "planificacion", "ver")) {
    acciones.push({
      id: "plan",
      label: "Ver planificación",
      href: "/planificacion",
    });
  }
  return acciones;
}

export async function cargarDashboard(perfil: PerfilSesion): Promise<DashboardInicio> {
  const ahora = new Date();
  const hoy = hoyIso();
  const base = {
    nombre: primerNombre(perfil.nombre),
    saludo: saludoAhora(ahora),
    fecha: fechaLarga(hoy),
    actualizado: horaAhora(ahora),
    acciones: accionesDe(perfil),
  };
  const verSolicitudes = puede(perfil, "solicitudes", "ver");
  const verProduccion = puede(perfil, "produccion", "ver");
  const verPlan = puede(perfil, "planificacion", "ver");
  const hrefActividad = verSolicitudes ? "/solicitudes" : verProduccion ? "/produccion" : null;

  if (!supabaseEnvConfigured()) {
    const estado: EstadoMedidor = "sin-conexion";
    return {
      ...base,
      sistemaTono: "danger",
      sistemaTexto: "Falta la configuración de conexión",
      errores: [],
      medidores: [
        medidor({
          id: "pendientes",
          titulo: "Solicitudes pendientes",
          accion: "Ver solicitudes",
          href: "/solicitudes",
          puedeVer: verSolicitudes,
          estado,
          valor: null,
          unidad: null,
          detalleOk: null,
        }),
        medidor({
          id: "curso",
          titulo: "Producción en curso",
          accion: "Ver producción",
          href: "/produccion",
          puedeVer: verProduccion,
          estado,
          valor: null,
          unidad: null,
          detalleOk: null,
        }),
        medidor({
          id: "kg",
          titulo: "Kg producidos hoy",
          accion: "Ver detalle",
          href: "/produccion",
          puedeVer: verProduccion,
          estado,
          valor: null,
          unidad: "kg",
          detalleOk: null,
        }),
        medidor({
          id: "programadas",
          titulo: "Órdenes programadas",
          accion: "Ver planificación",
          href: "/planificacion",
          puedeVer: verPlan,
          estado,
          valor: null,
          unidad: null,
          detalleOk: null,
        }),
      ],
      actividad: {
        filas: [],
        href: hrefActividad,
        vacio: "Sin conexión con la base de datos.",
      },
      alertas: [],
    };
  }

  const leerSolicitudes = puede(perfil, "solicitudes", "leer");
  const leerProduccion = puede(perfil, "produccion", "leer");
  const leerPlan = puede(perfil, "planificacion", "leer");
  const leerIngredientes = puede(perfil, "ingredientes", "leer");

  const [solicitudesRes, produccionRes, planRes, ingredientesRes] = await Promise.all([
    leerSolicitudes ? cargarDatosSolicitudes() : Promise.resolve(null),
    leerProduccion
      ? intentar(() => leerColumnas("produccion", "fecha_registro, peso_kg, id_solicitud"))
      : Promise.resolve(null),
    leerPlan
      ? intentar(() =>
          leerColumnas("planificacion_mensual", "fecha, kg_estimados, pallets_estimados"),
        )
      : Promise.resolve(null),
    leerIngredientes ? cargarCatalogo("ingredientes") : Promise.resolve(null),
  ]);

  const errores: string[] = [];
  if (solicitudesRes?.error) errores.push(solicitudesRes.error);
  if (produccionRes?.error) errores.push(produccionRes.error);
  if (planRes?.error) errores.push(planRes.error);
  if (ingredientesRes?.error) errores.push(ingredientesRes.error);

  const solicitudes = solicitudesRes?.error ? [] : (solicitudesRes?.solicitudes ?? []);
  const resumen = resumenSolicitudes(solicitudes);

  let kgHoy = 0;
  const idsProducidosHoy = new Set<number>();
  if (produccionRes?.data) {
    for (const fila of produccionRes.data) {
      if (aFecha(fila.fecha_registro) !== hoy) continue;
      kgHoy += numero(fila.peso_kg);
      const idSolicitud = idEntero(fila.id_solicitud);
      if (idSolicitud != null) idsProducidosHoy.add(idSolicitud);
    }
  }

  let programadas = 0;
  if (planRes?.data) {
    for (const fila of planRes.data) {
      if (aFecha(fila.fecha) !== hoy) continue;
      if (numero(fila.kg_estimados) > 0.0005 || numero(fila.pallets_estimados) > 0.0005) {
        programadas += 1;
      }
    }
  }

  const estadoSolicitudes: EstadoMedidor = !leerSolicitudes
    ? "sin-permiso"
    : solicitudesRes?.error
      ? "error"
      : "ok";
  const estadoProduccion: EstadoMedidor = !leerProduccion
    ? "sin-permiso"
    : produccionRes?.error
      ? "error"
      : "ok";
  const estadoPlan: EstadoMedidor = !leerPlan
    ? "sin-permiso"
    : planRes?.error
      ? "error"
      : "ok";

  const alertas: AlertaInicio[] = [];
  if (ingredientesRes && !ingredientesRes.error && puede(perfil, "ingredientes", "ver")) {
    const minimo = CATALOGOS.ingredientes.stockMinimo;
    const activos = ingredientesRes.articulos.filter((item) => item.estado === ESTADO_ACTIVO);
    const bajos = activos.filter((item) => item.stock < minimo).length;
    if (bajos > 0) {
      alertas.push({
        cantidad: bajos,
        texto: bajos === 1 ? "ingrediente con stock bajo" : "ingredientes con stock bajo",
        href: "/ingredientes",
      });
    }
    const limite = sumarDias(hoy, DIAS_PROXIMO_VENCIMIENTO);
    let vencidos = 0;
    let proximos = 0;
    for (const item of activos) {
      for (const lote of item.lotes) {
        const vence = aFecha(lote.vencimiento);
        if (!vence) continue;
        if (vence < hoy) vencidos += 1;
        else if (vence <= limite) proximos += 1;
      }
    }
    if (vencidos > 0) {
      alertas.push({
        cantidad: vencidos,
        texto: vencidos === 1 ? "lote vencido" : "lotes vencidos",
        href: "/ingredientes",
      });
    }
    if (proximos > 0) {
      alertas.push({
        cantidad: proximos,
        texto: proximos === 1 ? "lote vence dentro de 30 días" : "lotes vencen dentro de 30 días",
        href: "/ingredientes",
      });
    }
  }
  if (estadoSolicitudes === "ok" && resumen.pendientes > 0 && verSolicitudes) {
    alertas.push({
      cantidad: resumen.pendientes,
      texto: resumen.pendientes === 1 ? "solicitud pendiente" : "solicitudes pendientes",
      href: "/solicitudes",
    });
  }

  let vacio = "No hay actividad registrada para hoy.";
  let filas: FilaActividad[] = [];
  if (!leerSolicitudes) {
    vacio = "No tenés permiso de lectura para ver la actividad de hoy.";
  } else if (solicitudesRes?.error) {
    vacio = "No se pudo cargar la actividad de hoy.";
  } else {
    filas = armarActividad(perfil, solicitudes, idsProducidosHoy, hoy);
  }

  return {
    ...base,
    sistemaTono: errores.length === 0 ? "ok" : "warning",
    sistemaTexto:
      errores.length === 0
        ? "Todo funcionando correctamente"
        : "Algunos datos no se pudieron cargar",
    errores,
    medidores: [
      medidor({
        id: "pendientes",
        titulo: "Solicitudes pendientes",
        accion: "Ver solicitudes",
        href: "/solicitudes",
        puedeVer: verSolicitudes,
        estado: estadoSolicitudes,
        valor: resumen.pendientes,
        unidad: null,
        detalleOk: null,
      }),
      medidor({
        id: "curso",
        titulo: "Producción en curso",
        accion: "Ver producción",
        href: "/produccion",
        puedeVer: verProduccion,
        estado: estadoSolicitudes,
        valor: resumen.en_produccion,
        unidad: null,
        detalleOk: null,
      }),
      medidor({
        id: "kg",
        titulo: "Kg producidos hoy",
        accion: "Ver detalle",
        href: "/produccion",
        puedeVer: verProduccion,
        estado: estadoProduccion,
        valor: kgHoy,
        unidad: "kg",
        detalleOk: null,
      }),
      medidor({
        id: "programadas",
        titulo: "Órdenes programadas",
        accion: "Ver planificación",
        href: "/planificacion",
        puedeVer: verPlan,
        estado: estadoPlan,
        valor: programadas,
        unidad: null,
        detalleOk: "Líneas del plan de hoy",
      }),
    ],
    actividad: { filas, href: hrefActividad, vacio },
    alertas,
  };
}
