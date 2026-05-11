export type TemaApp = 'automatico' | 'claro' | 'oscuro';
export type UnidadDistancia = 'km' | 'mi';

export interface ConfiguracionApp {
  rendimientoKmLitro: number;
  precioLitro: number;
  moneda: string;
  unidadDistancia: UnidadDistancia;
  tema: TemaApp;
}

export const CONFIGURACION_DEFECTO: ConfiguracionApp = {
  rendimientoKmLitro: 25,
  precioLitro: 4,
  moneda: 'S/',
  unidadDistancia: 'km',
  tema: 'oscuro',
};
