export type TablaRespaldo = {
  nombre: string;
  columnas: string[];
  filas: number | null;
};

export type TablaEsquema = {
  nombre: string;
  columnas: string[];
  orden: string;
};

export type TablaExport = {
  nombre: string;
  columnas: string[];
  filas: Record<string, unknown>[];
};

export type FormatoRespaldo = "xlsx" | "pdf" | "sql" | "json";

export type PedidoRespaldo = {
  nombre: string;
  columnas: string[];
};
