export const MODULOS = [
  { id: "inicio", label: "Inicio", href: "/" },
  { id: "solicitudes", label: "Solicitudes", href: "/solicitudes" },
  { id: "ingredientes", label: "Ingredientes", href: "/ingredientes" },
  { id: "insumos", label: "Insumos", href: "/insumos" },
  { id: "envases", label: "Envases", href: "/envases" },
  { id: "etiquetas", label: "Etiquetas", href: "/etiquetas" },
  { id: "productos", label: "Productos", href: "/productos" },
  { id: "recetas", label: "Recetas", href: "/recetas" },
  { id: "movimientos", label: "Movimientos", href: "/movimientos" },
  { id: "planificacion", label: "Planificación", href: "/planificacion" },
  { id: "produccion", label: "Producción", href: "/produccion" },
  { id: "informes", label: "Informes", href: "/informes" },
  { id: "analytics", label: "Data Analytics", href: "/analytics" },
  { id: "usuarios", label: "Usuarios", href: "/usuarios" },
] as const;

export type ModuloId = (typeof MODULOS)[number]["id"];

export type AccionPermiso = "ver" | "leer" | "editar";

export type PermisoModulo = {
  modulo: string;
  puede_ver: boolean;
  puede_leer: boolean;
  puede_editar: boolean;
};
