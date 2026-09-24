import { createAdminClient } from "@/lib/supabase/admin";
import { MOVIMIENTOS, tipoClave } from "@/lib/movimientos/logic";
import {
  aPesos,
  costoTotal,
  estadoVisible,
  monedaDe,
  ORIGENES_CONTABLES,
  type EstadoFacturacion,
  type Moneda,
} from "@/lib/contabilidad/logic";
import { aFecha, idEntero, numero, texto } from "@/lib/solicitudes/logic";
import type { PerfilSesion } from "@/lib/auth/permisos-core";

const BUCKET = "contabilidad";
const MAX_BYTES = 8 * 1024 * 1024;

const TABLAS = new Set(ORIGENES_CONTABLES.map((k) => MOVIMIENTOS[k].tabla));

function tablaAusente(mensaje: string) {
  const n = mensaje.toLowerCase();
  return (
    n.includes("contable_movimientos") ||
    n.includes("contable_pagos") ||
    n.includes("schema cache") ||
    n.includes("does not exist")
  );
}

function campoTexto(fd: FormData, campo: string) {
  const v = fd.get(campo);
  return typeof v === "string" ? v.trim() : "";
}

function leerImporte(fd: FormData, campo: string, etiqueta: string): number | null {
  const raw = campoTexto(fd, campo);
  if (!raw) return null;
  const n = numero(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${etiqueta} no puede ser negativo.`);
  return Math.round(n * 100) / 100;
}

function archivoDe(fd: FormData, campo: string): File | null {
  const v = fd.get(campo);
  if (!(v instanceof File) || v.size === 0) return null;
  return v;
}

function nombreSeguro(nombre: string) {
  const base = nombre.split(/[/\\]/).pop() || "archivo";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}

function mimePermitido(file: File, factura: boolean) {
  const tipo = file.type.toLowerCase();
  const nombre = file.name.toLowerCase();
  const pdf = tipo === "application/pdf" || nombre.endsWith(".pdf");
  if (!factura) return pdf;
  const imagen =
    tipo === "image/jpeg" ||
    tipo === "image/png" ||
    tipo === "image/webp" ||
    /\.(jpe?g|png|webp)$/.test(nombre);
  return pdf || imagen;
}

function leerPagos(fd: FormData): { idForma: number; monto: number; moneda: Moneda }[] {
  const raw = campoTexto(fd, "pagos_json");
  if (!raw) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    throw new Error("Los pagos no son válidos.");
  }
  if (!Array.isArray(arr)) throw new Error("Los pagos no son válidos.");
  const out: { idForma: number; monto: number; moneda: Moneda }[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const fila = item as { id_forma_pago?: unknown; monto?: unknown; moneda?: unknown };
    const forma = texto(fila.id_forma_pago);
    const montoRaw = texto(fila.monto);
    if (!forma && !montoRaw) continue;
    const idForma = idEntero(forma);
    const monto = numero(montoRaw);
    if (idForma == null) throw new Error("Elegí la forma de pago de cada línea.");
    if (!montoRaw || !Number.isFinite(monto) || monto < 0) {
      throw new Error("El monto de cada pago tiene que ser cero o mayor.");
    }
    out.push({
      idForma,
      monto: Math.round(monto * 100) / 100,
      moneda: monedaDe(fila.moneda),
    });
  }
  return out;
}

async function maxIdPagos() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contable_pagos")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return idEntero(data?.[0]?.id) ?? 0;
}

async function cotizacionActual() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contable_cotizacion")
    .select("pesos_por_dolar")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  const n = numero(data.pesos_por_dolar);
  return n > 0 ? n : null;
}

async function reemplazarPagos(idFicha: number, pagos: { idForma: number; monto: number; moneda: Moneda }[]) {
  const admin = createAdminClient();
  const { error: errDel } = await admin.from("contable_pagos").delete().eq("id_contable", idFicha);
  if (errDel) throw new Error(errDel.message);
  if (!pagos.length) return;
  let next = await maxIdPagos();
  const filas = pagos.map((p) => ({
    id: ++next,
    id_contable: idFicha,
    id_forma_pago: p.idForma,
    monto: p.monto,
    moneda: p.moneda,
  }));
  const { error } = await admin.from("contable_pagos").insert(filas);
  if (error) throw new Error(error.message);
}

async function maxId() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contable_movimientos")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return idEntero(data?.[0]?.id) ?? 0;
}

async function subir(tabla: string, idMovimiento: number, cual: "remito" | "factura", file: File) {
  if (file.size > MAX_BYTES) throw new Error("El archivo supera 8 MB.");
  if (!mimePermitido(file, cual === "factura")) {
    throw new Error(
      cual === "factura"
        ? "La factura tiene que ser PDF o imagen (JPG, PNG, WEBP)."
        : "El remito tiene que ser un PDF.",
    );
  }
  const ruta = `comprobantes/${tabla}/${idMovimiento}/${cual}-${Date.now()}-${nombreSeguro(file.name)}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(ruta, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return ruta;
}

async function borrarObjetos(rutas: string[]) {
  const limpias = rutas.filter(Boolean);
  if (!limpias.length) return;
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove(limpias);
}

type FilaGuardada = {
  id: number;
  comprobante_remito: string | null;
  comprobante_factura: string | null;
  id_usuario_registro: number;
  fecha_hora_registro: string;
};

async function fichaActual(tabla: string, idMovimiento: number): Promise<FilaGuardada | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contable_movimientos")
    .select("id, comprobante_remito, comprobante_factura, id_usuario_registro, fecha_hora_registro")
    .eq("tabla_origen", tabla)
    .eq("id_movimiento", idMovimiento)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const id = idEntero(data.id);
  const idUsuario = idEntero(data.id_usuario_registro);
  if (id == null || idUsuario == null) return null;
  return {
    id,
    comprobante_remito: texto(data.comprobante_remito) || null,
    comprobante_factura: texto(data.comprobante_factura) || null,
    id_usuario_registro: idUsuario,
    fecha_hora_registro: texto(data.fecha_hora_registro),
  };
}

export async function borrarFichaSiExiste(tabla: string, idMovimiento: number) {
  if (!TABLAS.has(tabla)) return;
  try {
    const actual = await fichaActual(tabla, idMovimiento);
    if (!actual) return;
    await borrarObjetos([actual.comprobante_remito || "", actual.comprobante_factura || ""]);
    const admin = createAdminClient();
    const { error: errPagos } = await admin.from("contable_pagos").delete().eq("id_contable", actual.id);
    if (errPagos && !tablaAusente(errPagos.message)) throw new Error(errPagos.message);
    const { error } = await admin.from("contable_movimientos").delete().eq("id", actual.id);
    if (error) throw new Error(error.message);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "";
    if (tablaAusente(mensaje)) return;
    throw e instanceof Error ? e : new Error("No se pudo borrar la ficha contable");
  }
}

export async function guardarFicha(perfil: PerfilSesion, fd: FormData) {
  if (perfil.usuarioId == null) {
    throw new Error("Tu usuario no está vinculado en la tabla usuarios.");
  }
  const tabla = campoTexto(fd, "tabla_origen");
  const idMovimiento = idEntero(campoTexto(fd, "id_movimiento"));
  if (!TABLAS.has(tabla) || idMovimiento == null) {
    throw new Error("El ingreso no es válido.");
  }

  const admin = createAdminClient();
  const { data: mov, error: errMov } = await admin
    .from(tabla)
    .select("id, tipo")
    .eq("id", idMovimiento)
    .maybeSingle();
  if (errMov) throw new Error(errMov.message);
  if (!mov || tipoClave(mov.tipo) !== "ingreso") {
    throw new Error("Solo se carga contabilidad de un ingreso existente.");
  }

  const impacta = campoTexto(fd, "impacta") !== "0";
  const moneda = monedaDe(campoTexto(fd, "moneda"));
  let costoSinIva = leerImporte(fd, "costo_sin_iva", "El costo sin IVA");
  let costoIva = leerImporte(fd, "costo_iva", "El IVA");
  let pagos = leerPagos(fd);
  if (!impacta) {
    costoSinIva = 0;
    costoIva = 0;
    pagos = pagos.map((p) => ({ ...p, monto: 0 }));
  }
  const cotizacion = await cotizacionActual();
  const total = costoTotal(costoSinIva, costoIva);
  const totalPesos = aPesos(total, moneda, cotizacion);
  let abonadoPesos: number | null = pagos.length ? 0 : 0;
  if (pagos.length) {
    let suma = 0;
    for (const pago of pagos) {
      const enPesos = aPesos(pago.monto, pago.moneda, cotizacion);
      if (enPesos == null) {
        abonadoPesos = null;
        break;
      }
      suma += enPesos;
    }
    if (abonadoPesos != null) abonadoPesos = Math.round(suma * 100) / 100;
  }
  const cancelada = campoTexto(fd, "cancelada") === "1";
  const estado: EstadoFacturacion = estadoVisible(
    cancelada ? "cancelada" : null,
    totalPesos,
    abonadoPesos,
  );

  if (pagos.length) {
    const ids = [...new Set(pagos.map((p) => p.idForma))];
    const { data: formas, error: errForma } = await admin
      .from("formas_de_pago")
      .select("id")
      .in("id", ids);
    if (errForma) throw new Error(errForma.message);
    if ((formas ?? []).length !== ids.length) throw new Error("Hay una forma de pago que no existe.");
  }

  const actual = await fichaActual(tabla, idMovimiento);
  const remito = archivoDe(fd, "comprobante_remito");
  const factura = archivoDe(fd, "comprobante_factura");
  let rutaRemito = actual?.comprobante_remito ?? null;
  let rutaFactura = actual?.comprobante_factura ?? null;
  if (campoTexto(fd, "quitar_remito") === "1") rutaRemito = null;
  if (campoTexto(fd, "quitar_factura") === "1") rutaFactura = null;

  const subidas: string[] = [];
  let guardado = false;
  try {
    if (remito) {
      rutaRemito = await subir(tabla, idMovimiento, "remito", remito);
      subidas.push(rutaRemito);
    }
    if (factura) {
      rutaFactura = await subir(tabla, idMovimiento, "factura", factura);
      subidas.push(rutaFactura);
    }

    const ahora = new Date().toISOString();
    const comun = {
      numero_factura: campoTexto(fd, "numero_factura") || null,
      vencimiento_facturacion: aFecha(campoTexto(fd, "vencimiento_facturacion")),
      comprobante_remito: rutaRemito,
      comprobante_factura: rutaFactura,
      costo_sin_iva: costoSinIva,
      costo_iva: costoIva,
      moneda,
      impacta,
      monto_abonado: abonadoPesos,
      id_forma_pago: null,
      estado_facturacion: estado,
      observaciones: campoTexto(fd, "observaciones") || null,
      id_usuario_ultima_actualizacion: perfil.usuarioId,
      fecha_hora_ultima_actualizacion: ahora,
    };

    const idFicha = actual?.id ?? (await maxId()) + 1;
    const q = actual
      ? admin.from("contable_movimientos").update(comun).eq("id", idFicha)
      : admin.from("contable_movimientos").insert({
          ...comun,
          id: idFicha,
          tabla_origen: tabla,
          id_movimiento: idMovimiento,
          id_usuario_registro: perfil.usuarioId,
          fecha_hora_registro: ahora,
          id_usuario_ultima_actualizacion: null,
          fecha_hora_ultima_actualizacion: null,
        });
    const { error } = await q;
    if (error) throw new Error(error.message);
    guardado = true;
    await reemplazarPagos(idFicha, pagos);

    const viejos: string[] = [];
    if (remito && actual?.comprobante_remito) viejos.push(actual.comprobante_remito);
    if (factura && actual?.comprobante_factura) viejos.push(actual.comprobante_factura);
    if (!remito && campoTexto(fd, "quitar_remito") === "1" && actual?.comprobante_remito) {
      viejos.push(actual.comprobante_remito);
    }
    if (!factura && campoTexto(fd, "quitar_factura") === "1" && actual?.comprobante_factura) {
      viejos.push(actual.comprobante_factura);
    }
    await borrarObjetos(viejos);
  } catch (e) {
    if (!guardado) await borrarObjetos(subidas);
    throw e instanceof Error ? e : new Error("No se pudo guardar la ficha");
  }
}

export async function urlComprobante(ruta: string) {
  if (!ruta.startsWith("comprobantes/") || ruta.includes("..")) {
    throw new Error("El comprobante no es válido.");
  }
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(ruta, 300);
  if (error || !data?.signedUrl) throw new Error(error?.message || "No se pudo abrir el archivo");
  return data.signedUrl;
}

export async function definirImpacto(
  perfil: PerfilSesion,
  tabla: string,
  idMovimiento: number,
  impacta: boolean,
) {
  if (perfil.usuarioId == null) {
    throw new Error("Tu usuario no está vinculado en la tabla usuarios.");
  }
  if (!TABLAS.has(tabla)) throw new Error("El ingreso no es válido.");
  const admin = createAdminClient();
  const { data: mov, error: errMov } = await admin
    .from(tabla)
    .select("id, tipo")
    .eq("id", idMovimiento)
    .maybeSingle();
  if (errMov) throw new Error(errMov.message);
  if (!mov || tipoClave(mov.tipo) !== "ingreso") {
    throw new Error("Solo se marca un ingreso existente.");
  }
  const actual = await fichaActual(tabla, idMovimiento);
  const ahora = new Date().toISOString();
  if (!actual) {
    const { error } = await admin.from("contable_movimientos").insert({
      id: (await maxId()) + 1,
      tabla_origen: tabla,
      id_movimiento: idMovimiento,
      id_usuario_registro: perfil.usuarioId,
      fecha_hora_registro: ahora,
      impacta,
      moneda: "ARS",
      costo_sin_iva: impacta ? null : 0,
      costo_iva: impacta ? null : 0,
      monto_abonado: impacta ? null : 0,
      estado_facturacion: "pendiente",
    });
    if (error) throw new Error(error.message);
    return;
  }
  const parche: Record<string, unknown> = {
    impacta,
    id_usuario_ultima_actualizacion: perfil.usuarioId,
    fecha_hora_ultima_actualizacion: ahora,
  };
  if (!impacta) {
    parche.costo_sin_iva = 0;
    parche.costo_iva = 0;
    parche.monto_abonado = 0;
    parche.estado_facturacion = "pendiente";
  }
  const { error } = await admin.from("contable_movimientos").update(parche).eq("id", actual.id);
  if (error) throw new Error(error.message);
  if (!impacta) {
    const { error: errPagos } = await admin
      .from("contable_pagos")
      .update({ monto: 0 })
      .eq("id_contable", actual.id);
    if (errPagos && !tablaAusente(errPagos.message)) throw new Error(errPagos.message);
  }
}

export async function guardarCotizacion(perfil: PerfilSesion, valor: string) {
  if (perfil.usuarioId == null) {
    throw new Error("Tu usuario no está vinculado en la tabla usuarios.");
  }
  const n = numero(valor);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("El valor del dólar tiene que ser mayor a cero.");
  }
  const admin = createAdminClient();
  const { error } = await admin.from("contable_cotizacion").upsert({
    id: 1,
    pesos_por_dolar: Math.round(n * 100) / 100,
    fecha_hora_actualizacion: new Date().toISOString(),
    id_usuario: perfil.usuarioId,
  });
  if (error) throw new Error(error.message);
}
