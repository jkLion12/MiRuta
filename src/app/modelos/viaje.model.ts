export interface PuntoRuta {
  lat: number;
  lng: number;
  precision?: number;
  timestamp: number;
}

export type TipoViaje = 'gps' | 'manual';

export interface Viaje {
  id: string;
  tipo: TipoViaje;
  fechaInicio: string;
  fechaFin: string;
  origen: string;
  destino: string;
  distanciaKm: number;
  duracionSegundos: number;
  ingreso: number;
  costoCombustible: number;
  litrosCargados?: number;
  ruta: PuntoRuta[];
  notas?: string;
}

export interface ResumenViajes {
  totalKm: number;
  totalIngresos: number;
  totalCombustible: number;
  gananciaNeta: number;
  ingresoPorKm: number;
}
