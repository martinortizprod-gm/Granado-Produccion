"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermiso } from "@/lib/auth/permisos";
import { cargarProduccion } from "@/lib/produccion/data";
import {
  PREFIJO_CIERRE,
  RESP_ENCARGADO,
  RESP_OPERARIO,
  PayloadRegistro,
  calcularHoras,
  kgElaborados,
  rendimiento,
  unidadesElaboradas,
  validarRegistro,
} from "@/lib/produccion/logic";
import { aFecha, clave, idEntero, texto } from "@/lib/solicitudes/logic";
import { hoyIso } from "@/lib/planificacion/logic";

async function maxId(tabla: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from(tabla).select("id").order("id", { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return idEntero(data?.[0]?.id) ?? 0;
}

function refrescar() {
  for (const ruta of [
    "/produccion",
    "/solicitudes",
    "/movimientos",
    "/productos",
    "/planificacion",
    "/ingredientes",
    "/insumos",
    "/envases",
    "/etiquetas",
  ]) {
    revalidatePath(ruta);
  }
}

async function borrarIds(tabla: string, ids: number[]) {
  if (!ids.length) return;
  const admin = createAdminClient();
  const { error } = await admin.from(tabla).delete().in("id", ids);
  if (error) throw new Error(error.message);
}

export async function registrarJornada(payload: PayloadRegistro) {
  await requirePermiso("produccion", "editar");
  const datos = await cargarProduccion();
  if (datos.error) throw new Error(datos.error);
  const errores = validarRegistro(datos, payload);
  if (errores.length) throw new Error(errores.join(" "));
  const fecha = aFecha(payload.fecha);
  if (!fecha) throw new Error("La fecha de la jornada no es válida.");

  const admin = createAdminClient();
  const solicitud = payload.idSolicitud == null ? null : datos.solicitudes.find((item) => item.id === payload.idSolicitud);
  if (payload.idSolicitud != null && !solicitud) throw new Error("No se encontró la solicitud.");

  if (solicitud?.id != null) {
    await borrarIds(
      "responsables_producciones",
      datos.solicitudes.length
        ? (
            await admin
              .from("responsables_producciones")
              .select("id, id_solicitud, responsabilidad")
              .eq("id_solicitud", solicitud.id)
          ).data
            ?.filter((fila) => texto(fila.responsabilidad) === RESP_OPERARIO || texto(fila.responsabilidad) === RESP_ENCARGADO)
            .map((fila) => idEntero(fila.id))
            .filter((id): id is number => id != null) ?? []
        : [],
    );
    let idResp = (await maxId("responsables_producciones")) + 1;
    const filasResp = [
      ...payload.idsOperarios.map((idUsuario) => ({
        id: idResp++,
        id_solicitud: solicitud.id,
        id_usuario: idUsuario,
        responsabilidad: RESP_OPERARIO,
      })),
      ...(payload.idEncargado != null
        ? [
            {
              id: idResp++,
              id_solicitud: solicitud.id,
              id_usuario: payload.idEncargado,
              responsabilidad: RESP_ENCARGADO,
            },
          ]
        : []),
    ];
    if (filasResp.length) {
      const { error } = await admin.from("responsables_producciones").insert(filasResp);
      if (error) throw new Error(error.message);
    }
    await borrarIds(
      "limpieza_equipos",
      datos.limpiezasRef.filter((fila) => fila.idSolicitud === solicitud.id).map((fila) => fila.id),
    );
    let idLimp = (await maxId("limpieza_equipos")) + 1;
    const hoy = hoyIso();
    const { error: errorLimp } = await admin.from("limpieza_equipos").insert(
      payload.idsLimpieza.map((idEquipo) => ({
        id: idLimp++,
        fecha_registro: hoy,
        id_solicitud: solicitud.id,
        id_equipo: idEquipo,
      })),
    );
    if (errorLimp) throw new Error(errorLimp.message);
  } else {
    await borrarIds(
      "limpieza_equipos",
      datos.limpiezasRef.filter((fila) => fila.idSolicitud == null && fila.fecha === fecha).map((fila) => fila.id),
    );
    let idLimp = (await maxId("limpieza_equipos")) + 1;
    const { error: errorLimp } = await admin.from("limpieza_equipos").insert(
      payload.idsLimpieza.map((idEquipo) => ({
        id: idLimp++,
        fecha_registro: fecha,
        id_solicitud: null,
        id_equipo: idEquipo,
      })),
    );
    if (errorLimp) throw new Error(errorLimp.message);
  }

  const { hsPp, hsNp, hsProd } = calcularHoras(payload.hsDisponibles, payload.paradasProg, payload.paradasNo);
  const pallets = solicitud ? payload.pallets : 0;
  const unidades = solicitud ? unidadesElaboradas(solicitud, pallets) : 0;
  const kg = solicitud ? kgElaborados(solicitud, pallets) : 0;
  const filaJornada = {
    fecha_registro: fecha,
    id_solicitud: solicitud?.id ?? null,
    pallets,
    unidades,
    peso_kg: kg,
    hs_disponibles: payload.hsDisponibles,
    hs_productivas: hsProd,
    hs_paradas_programadas: hsPp,
    hs_paradas_no_p: hsNp,
    rendimiento_kg_h: solicitud ? rendimiento(kg, hsProd) : 0,
  };

  let idProduccion = payload.idProduccion;
  const detalleAnterior = idProduccion != null ? datos.detalles[String(idProduccion)] : undefined;
  if (idProduccion != null) {
    if (!detalleAnterior) throw new Error("No se encontró la producción a editar.");
    const { error } = await admin.from("produccion").update(filaJornada).eq("id", idProduccion);
    if (error) throw new Error(error.message);
  } else {
    idProduccion = (await maxId("produccion")) + 1;
    const { error } = await admin.from("produccion").insert({ id: idProduccion, ...filaJornada });
    if (error) throw new Error(error.message);
  }

  await borrarIds(
    "paradas_programadas",
    (
      await admin.from("paradas_programadas").select("id").eq("id_produccion", idProduccion)
    ).data
      ?.map((fila) => idEntero(fila.id))
      .filter((id): id is number => id != null) ?? [],
  );
  await borrarIds(
    "paradas_no_programadas",
    (
      await admin.from("paradas_no_programadas").select("id").eq("id_produccion", idProduccion)
    ).data
      ?.map((fila) => idEntero(fila.id))
      .filter((id): id is number => id != null) ?? [],
  );
  let idParada = (await maxId("paradas_programadas")) + 1;
  const filasProg = payload.paradasProg
    .filter((parada) => parada.tiempo > 0 && parada.idCausa > 0)
    .map((parada) => ({
      id: idParada++,
      id_produccion: idProduccion,
      id_causas: parada.idCausa,
      tiempo_en_hs: parada.tiempo,
      descripcion: texto(parada.descripcion) || null,
    }));
  if (filasProg.length) {
    const { error } = await admin.from("paradas_programadas").insert(filasProg);
    if (error) throw new Error(error.message);
  }
  idParada = (await maxId("paradas_no_programadas")) + 1;
  const filasNo = payload.paradasNo
    .filter((parada) => parada.tiempo > 0 && parada.idCausa > 0)
    .map((parada) => ({
      id: idParada++,
      id_produccion: idProduccion,
      id_causas: parada.idCausa,
      tiempo_en_hs: parada.tiempo,
      descripcion: texto(parada.descripcion) || null,
    }));
  if (filasNo.length) {
    const { error } = await admin.from("paradas_no_programadas").insert(filasNo);
    if (error) throw new Error(error.message);
  }

  if (solicitud?.id != null) {
    const fechaConsumo = detalleAnterior?.fecha ?? fecha;
    await borrarIds(
      "consumo",
      datos.consumosRef
        .filter((fila) => fila.idSolicitud === solicitud.id && fila.fecha === fechaConsumo)
        .map((fila) => fila.id),
    );
    const filasConsumo: Record<string, unknown>[] = [];
    let idConsumo = (await maxId("consumo")) + 1;
    const idIng = (idOrigen: number) =>
      datos.articulos.find((art) => art.tipo === "ingrediente" && art.idOrigen === idOrigen)?.id ?? null;
    for (const lote of payload.lotes) {
      if (lote.cantidad <= 0) continue;
      const idArt = idIng(lote.idIngrediente);
      if (idArt == null) throw new Error(`No está el artículo unificado del ingrediente ${lote.articulo}.`);
      filasConsumo.push({
        id: idConsumo++,
        fecha_registro: fecha,
        id_solicitud: solicitud.id,
        id_articulo: idArt,
        lote_articulo: texto(lote.lote) || null,
        cantidad: lote.cantidad,
        pallet_inicio: lote.palletInicio,
        pallet_fin: lote.palletFin,
      });
    }
    if (unidades > 0 && solicitud.id_envase != null) {
      const idArt = datos.articulos.find((art) => art.tipo === "envase" && art.idOrigen === solicitud.id_envase)?.id;
      if (idArt == null) throw new Error("No está el artículo unificado del envase.");
      filasConsumo.push({
        id: idConsumo++,
        fecha_registro: fecha,
        id_solicitud: solicitud.id,
        id_articulo: idArt,
        lote_articulo: null,
        cantidad: unidades,
        pallet_inicio: null,
        pallet_fin: null,
      });
    }
    if (unidades > 0 && solicitud.id_etiqueta != null) {
      const idArt = datos.articulos.find((art) => art.tipo === "etiqueta" && art.idOrigen === solicitud.id_etiqueta)?.id;
      if (idArt == null) throw new Error("No está el artículo unificado de la etiqueta.");
      filasConsumo.push({
        id: idConsumo++,
        fecha_registro: fecha,
        id_solicitud: solicitud.id,
        id_articulo: idArt,
        lote_articulo: null,
        cantidad: unidades,
        pallet_inicio: null,
        pallet_fin: null,
      });
    }
    for (const insumo of payload.consumibles) {
      if (!insumo.aplica || pallets <= 0) continue;
      const idArt = datos.articulos.find((art) => art.tipo === "insumo" && clave(art.codigo) === clave(insumo.codigo))?.id;
      const nombre = datos.consumibles.find((item) => clave(item.codigo) === clave(insumo.codigo))?.nombre ?? insumo.codigo;
      if (idArt == null) throw new Error(`No está el artículo unificado del insumo ${nombre}.`);
      filasConsumo.push({
        id: idConsumo++,
        fecha_registro: fecha,
        id_solicitud: solicitud.id,
        id_articulo: idArt,
        lote_articulo: null,
        cantidad: pallets,
        pallet_inicio: null,
        pallet_fin: null,
      });
    }
    if (filasConsumo.length) {
      const { error } = await admin.from("consumo").insert(filasConsumo);
      if (error) throw new Error(error.message);
    }
    if (payload.barrido && payload.barrido.idIngrediente > 0 && payload.barrido.pesaje > 0) {
      const idBarrido = (await maxId("barridos_linea")) + 1;
      const { error } = await admin.from("barridos_linea").insert({
        id: idBarrido,
        id_solicitud: solicitud.id,
        id_ingrediente: payload.barrido.idIngrediente,
        pesaje_total: payload.barrido.pesaje,
      });
      if (error) throw new Error(error.message);
    }

    const cierre = datos.cierresProducto.find((item) => item.idProduccion === idProduccion);
    if (pallets <= 0.0005 || solicitud.id_producto == null || !texto(solicitud.lote)) {
      if (cierre) await borrarIds("movimientos_productos", [cierre.id]);
    } else {
      const filaMov = {
        tipo: "ingreso",
        fecha_registro: fecha,
        fecha_vencimiento: null,
        id_producto: solicitud.id_producto,
        lote: solicitud.lote,
        stk_pall: pallets,
        stk_un: unidades,
        stk_kg: kg,
        observaciones: `${PREFIJO_CIERRE}${idProduccion}`,
      };
      if (cierre) {
        const { error } = await admin.from("movimientos_productos").update(filaMov).eq("id", cierre.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await admin
          .from("movimientos_productos")
          .insert({ id: (await maxId("movimientos_productos")) + 1, ...filaMov });
        if (error) throw new Error(error.message);
      }
    }
  }

  refrescar();
}

export async function eliminarJornada(idProduccion: number) {
  await requirePermiso("produccion", "editar");
  const datos = await cargarProduccion();
  if (datos.error) throw new Error(datos.error);
  const detalle = datos.detalles[String(idProduccion)];
  if (!detalle) throw new Error("No se encontró la producción.");
  const cierre = datos.cierresProducto.find((item) => item.idProduccion === idProduccion);
  if (cierre) await borrarIds("movimientos_productos", [cierre.id]);
  await borrarIds("produccion", [idProduccion]);
  const admin = createAdminClient();
  const prog = await admin.from("paradas_programadas").select("id").eq("id_produccion", idProduccion);
  const noProg = await admin.from("paradas_no_programadas").select("id").eq("id_produccion", idProduccion);
  if (prog.error) throw new Error(prog.error.message);
  if (noProg.error) throw new Error(noProg.error.message);
  await borrarIds(
    "paradas_programadas",
    (prog.data ?? []).map((fila) => idEntero(fila.id)).filter((id): id is number => id != null),
  );
  await borrarIds(
    "paradas_no_programadas",
    (noProg.data ?? []).map((fila) => idEntero(fila.id)).filter((id): id is number => id != null),
  );
  if (detalle.idSolicitud == null) {
    const otra = datos.jornadas.some(
      (jornada) => jornada.id !== idProduccion && jornada.idSolicitud == null && jornada.fecha === detalle.fecha,
    );
    if (!otra && detalle.fecha) {
      await borrarIds(
        "limpieza_equipos",
        datos.limpiezasRef.filter((fila) => fila.idSolicitud == null && fila.fecha === detalle.fecha).map((fila) => fila.id),
      );
    }
  } else if (detalle.fecha) {
    await borrarIds(
      "consumo",
      datos.consumosRef
        .filter((fila) => fila.idSolicitud === detalle.idSolicitud && fila.fecha === detalle.fecha)
        .map((fila) => fila.id),
    );
  }
  refrescar();
}

export async function guardarPrevios(payload: {
  idSolicitud: number;
  idsOperarios: number[];
  idEncargado: number | null;
  idsLimpieza: number[];
  barrido: { idIngrediente: number; pesaje: number } | null;
}) {
  await requirePermiso("produccion", "editar");
  const datos = await cargarProduccion();
  if (datos.error) throw new Error(datos.error);
  const solicitud = datos.solicitudes.find((item) => item.id === payload.idSolicitud);
  if (!solicitud?.id) throw new Error("No se encontró la solicitud.");
  const admin = createAdminClient();
  await borrarIds(
    "responsables_producciones",
    (
      await admin.from("responsables_producciones").select("id, responsabilidad").eq("id_solicitud", solicitud.id)
    ).data
      ?.filter((fila) => texto(fila.responsabilidad) === RESP_OPERARIO || texto(fila.responsabilidad) === RESP_ENCARGADO)
      .map((fila) => idEntero(fila.id))
      .filter((id): id is number => id != null) ?? [],
  );
  let idResp = (await maxId("responsables_producciones")) + 1;
  const filasResp = [
    ...payload.idsOperarios.map((idUsuario) => ({
      id: idResp++,
      id_solicitud: solicitud.id,
      id_usuario: idUsuario,
      responsabilidad: RESP_OPERARIO,
    })),
    ...(payload.idEncargado != null
      ? [{ id: idResp++, id_solicitud: solicitud.id, id_usuario: payload.idEncargado, responsabilidad: RESP_ENCARGADO }]
      : []),
  ];
  if (filasResp.length) {
    const { error } = await admin.from("responsables_producciones").insert(filasResp);
    if (error) throw new Error(error.message);
  }
  await borrarIds(
    "limpieza_equipos",
    datos.limpiezasRef.filter((fila) => fila.idSolicitud === solicitud.id).map((fila) => fila.id),
  );
  if (payload.idsLimpieza.length) {
    let idLimp = (await maxId("limpieza_equipos")) + 1;
    const { error } = await admin.from("limpieza_equipos").insert(
      payload.idsLimpieza.map((idEquipo) => ({
        id: idLimp++,
        fecha_registro: hoyIso(),
        id_solicitud: solicitud.id,
        id_equipo: idEquipo,
      })),
    );
    if (error) throw new Error(error.message);
  }
  if (payload.barrido && payload.barrido.idIngrediente > 0 && payload.barrido.pesaje > 0) {
    const { error } = await admin.from("barridos_linea").insert({
      id: (await maxId("barridos_linea")) + 1,
      id_solicitud: solicitud.id,
      id_ingrediente: payload.barrido.idIngrediente,
      pesaje_total: payload.barrido.pesaje,
    });
    if (error) throw new Error(error.message);
  }
  refrescar();
}

export async function agregarCatalogoPrevio(
  tipo: "usuario" | "equipo" | "causa",
  nombre: string,
  apellido = "",
  rolUsuario = "operario",
) {
  await requirePermiso("produccion", "editar");
  const admin = createAdminClient();
  const limpio = texto(nombre);
  const ape = texto(apellido);
  if (tipo === "usuario") {
    if (!limpio) throw new Error("Indicá el nombre.");
    if (!ape) throw new Error("Indicá el apellido.");
    const id = (await maxId("usuarios")) + 1;
    const marca = clave(rolUsuario).includes("encargado") ? "encargado" : "operario";
    const { data: roles } = await admin.from("roles").select("id, nombre");
    const hallado = (roles ?? []).find((fila) => clave(fila.nombre).includes(marca));
    const { error } = await admin.from("usuarios").insert({
      id,
      fecha_registro: hoyIso(),
      nombre: limpio,
      apellido: ape,
      rol: marca,
      id_rol: idEntero(hallado?.id),
      contacto: null,
      clave: null,
      mail: null,
    });
    if (error) throw new Error(error.message);
  } else if (tipo === "equipo") {
    if (!limpio) throw new Error("Indicá el nombre del equipo.");
    const id = (await maxId("catalogo_equipos")) + 1;
    const { error } = await admin.from("catalogo_equipos").insert({ id, equipo: limpio });
    if (error) throw new Error(error.message);
  } else {
    if (!limpio) throw new Error("Indicá la causa.");
    const id = (await maxId("causas_paradas")) + 1;
    const { error } = await admin.from("causas_paradas").insert({ id, causa: limpio });
    if (error) throw new Error(error.message);
  }
  refrescar();
}
