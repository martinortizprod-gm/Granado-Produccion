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
  { id: "respaldos", label: "Respaldos", href: "/respaldos" },
] as const;

export type ModuloId = (typeof MODULOS)[number]["id"];

/** Agrupación solo visual del menú (no cambia rutas ni permisos). */
export const GRUPOS_NAV: { id: string; label: string; modulos: ModuloId[] }[] =
  [
    {
      id: "operacion",
      label: "Operación",
      modulos: [
        "inicio",
        "solicitudes",
        "produccion",
        "movimientos",
        "planificacion",
        "informes",
      ],
    },
    {
      id: "maestros",
      label: "Maestros",
      modulos: [
        "ingredientes",
        "insumos",
        "envases",
        "etiquetas",
        "productos",
        "recetas",
      ],
    },
    {
      id: "analisis",
      label: "Análisis",
      modulos: ["analytics"],
    },
    {
      id: "sistema",
      label: "Sistema",
      modulos: ["usuarios", "respaldos"],
    },
  ];

export type AccionPermiso = "ver" | "leer" | "editar";

export type PermisoModulo = {
  modulo: string;
  puede_ver: boolean;
  puede_leer: boolean;
  puede_editar: boolean;
};
