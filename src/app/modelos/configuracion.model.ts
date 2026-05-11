export type TemaAplicacion = 'sistema' | 'claro' | 'oscuro';
export type UnidadDistancia = 'km' | 'mi';
export type ModoRendimiento = 'km_l' | 'l_100km';

export interface ConfiguracionAplicacion {
  rendimientoModo: ModoRendimiento;
  rendimientoValor: number;
  precioCombustible: number;
  moneda: string;
  unidadDistancia: UnidadDistancia;
  tema: TemaAplicacion;
}

export const CONFIGURACION_PREDETERMINADA: ConfiguracionAplicacion = {
  rendimientoModo: 'km_l',
  rendimientoValor: 25,
  precioCombustible: 18.5,
  moneda: 'PEN',
  unidadDistancia: 'km',
  tema: 'oscuro',
};
