import { clave, idEntero, texto } from "@/lib/solicitudes/logic";

export type KindParte = "proveedores" | "clientes";

export type ConfigParte = {
  kind: KindParte;
  tabla: string;
  titulo: string;
  etiqueta: string;
  nuevo: string;
  subtitulo: string;
};

export const PARTES: Record<KindParte, ConfigParte> = {
  proveedores: {
    kind: "proveedores",
    tabla: "proveedores",
    titulo: "Proveedores",
    etiqueta: "Proveedor",
    nuevo: "Nuevo proveedor",
    subtitulo: "Altas para elegir al cargar un ingreso.",
  },
  clientes: {
    kind: "clientes",
    tabla: "clientes",
    titulo: "Clientes",
    etiqueta: "Cliente",
    nuevo: "Nuevo cliente",
    subtitulo: "Altas para elegir al cargar una solicitud.",
  },
};

export type ParteVista = {
  id: number;
  nombre: string;
  razon_social: string;
  cuit: string;
  celular: string;
  mail: string;
  ubicacion: string;
  observaciones: string;
};

export type DatosParteForm = {
  nombre: string;
  razon_social: string;
  cuit: string;
  celular: string;
  mail: string;
  ubicacion: string;
  observaciones: string;
};

export function vacioParte(): DatosParteForm {
  return {
    nombre: "",
    razon_social: "",
    cuit: "",
    celular: "",
    mail: "",
    ubicacion: "",
    observaciones: "",
  };
}

export function filaParte(fila: Record<string, unknown>): ParteVista | null {
  const id = idEntero(fila.id);
  if (id == null) return null;
  return {
    id,
    nombre: texto(fila.nombre),
    razon_social: texto(fila.razon_social),
    cuit: texto(fila.cuit),
    celular: texto(fila.celular),
    mail: texto(fila.mail),
    ubicacion: texto(fila.ubicacion),
    observaciones: texto(fila.observaciones),
  };
}

export function desdeParte(item: ParteVista): DatosParteForm {
  return {
    nombre: item.nombre,
    razon_social: item.razon_social,
    cuit: item.cuit,
    celular: item.celular,
    mail: item.mail,
    ubicacion: item.ubicacion,
    observaciones: item.observaciones,
  };
}

export function etiquetaParte(item: { nombre: string; razon_social: string }) {
  const nombre = texto(item.nombre);
  const razon = texto(item.razon_social);
  if (razon && clave(razon) !== clave(nombre)) return `${nombre} — ${razon}`;
  return nombre;
}

export function validarParte(
  datos: DatosParteForm,
  existentes: { id: number; nombre: string }[],
  idEdicion: number | null,
): string[] {
  const errores: string[] = [];
  const nombre = texto(datos.nombre);
  const razon = texto(datos.razon_social);
  if (!nombre) errores.push("Ingresá el nombre.");
  if (!razon) errores.push("Ingresá la razón social.");
  const mail = texto(datos.mail);
  if (mail && !mail.includes("@")) errores.push("El mail no es válido.");
  if (nombre) {
    const dup = existentes.some(
      (f) => clave(f.nombre) === clave(nombre) && f.id !== idEdicion,
    );
    if (dup) errores.push("Ya hay un registro con ese nombre.");
  }
  return errores;
}

export function filaGuardarParte(datos: DatosParteForm, id: number) {
  return {
    id,
    nombre: texto(datos.nombre),
    razon_social: texto(datos.razon_social),
    cuit: texto(datos.cuit) || null,
    celular: texto(datos.celular) || null,
    mail: texto(datos.mail) || null,
    ubicacion: texto(datos.ubicacion) || null,
    observaciones: texto(datos.observaciones) || null,
  };
}

export function filtrarPartes(items: ParteVista[], busqueda: string) {
  const termino = clave(busqueda);
  if (!termino) return items;
  return items.filter((item) =>
    [item.nombre, item.razon_social, item.cuit, item.celular, item.mail, item.ubicacion, item.observaciones]
      .some((c) => clave(c).includes(termino)),
  );
}
