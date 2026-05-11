export interface PuntoRuta {
  latitud: number;
  longitud: number;
  marcaTiempo: string;
  velocidadKmh?: number;
  precisionMetros?: number;
}

export interface Viaje {
  id: string;
  tipo: 'gps' | 'manual';
  fechaInicio: string;
  fechaFin: string;
  origen: string;
  destino: string;
  distanciaKm: number;
  duracionSegundos: number;
  ingreso: number;
  ingresosParciales: number[];
  combustibleEstimadoLitros: number;
  combustibleRealLitros?: number;
  costoCombustible: number;
  gananciaNeta: number;
  puntosRuta: PuntoRuta[];
  notas?: string;
}

export interface ViajeEnCurso {
  id: string;
  fechaInicio: string;
  distanciaKm: number;
  ingresoAcumulado: number;
  ingresosParciales: number[];
  combustibleEstimadoLitros: number;
  puntosRuta: PuntoRuta[];
}

export interface ResumenIndicadores {
  kilometros: number;
  ingresos: number;
  combustible: number;
  ganancia: number;
  ingresoPorKm: number;
}

export interface SerieGrafico {
  etiqueta: string;
  valor: number;
}
