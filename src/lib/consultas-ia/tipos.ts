export type FilaConsumoIa = {
  pedido: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  registros: number;
  estado: "ok" | "no_encontrado";
};

export type BarraConsultaIa = { etiqueta: string; valor: number };

export type ResultadoConsultaIa = {
  resumen: string;
  desde: string;
  hasta: string;
  fuente: string;
  redactoIa: boolean;
  columnas: string[];
  filas: string[][];
  barras?: BarraConsultaIa[];
};
