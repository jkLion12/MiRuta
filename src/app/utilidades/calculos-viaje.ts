import { ConfiguracionAplicacion } from '../modelos/configuracion.model';
import { PuntoRuta, ResumenIndicadores, Viaje } from '../modelos/viaje.model';

const RADIO_TIERRA_KM = 6371;

export function redondear(valor: number, decimales = 2): number {
  return Number(valor.toFixed(decimales));
}

export function calcularDistanciaEntrePuntos(origen: PuntoRuta, destino: PuntoRuta): number {
  const dLat = gradosARadianes(destino.latitud - origen.latitud);
  const dLng = gradosARadianes(destino.longitud - origen.longitud);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(gradosARadianes(origen.latitud)) *
      Math.cos(gradosARadianes(destino.latitud)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RADIO_TIERRA_KM * c;
}

export function calcularDistanciaRuta(puntos: PuntoRuta[]): number {
  if (puntos.length < 2) {
    return 0;
  }

  let total = 0;
  for (let i = 1; i < puntos.length; i += 1) {
    total += calcularDistanciaEntrePuntos(puntos[i - 1], puntos[i]);
  }
  return redondear(total);
}

export function calcularCombustibleEstimado(
  distanciaKm: number,
  configuracion: ConfiguracionAplicacion,
): number {
  if (configuracion.rendimientoValor <= 0) {
    return 0;
  }

  if (configuracion.rendimientoModo === 'km_l') {
    return redondear(distanciaKm / configuracion.rendimientoValor);
  }

  return redondear((distanciaKm * configuracion.rendimientoValor) / 100);
}

export function calcularCostoCombustible(
  litros: number | undefined,
  distanciaKm: number,
  configuracion: ConfiguracionAplicacion,
): number {
  const litrosBase = litros ?? calcularCombustibleEstimado(distanciaKm, configuracion);
  return redondear(litrosBase * configuracion.precioCombustible);
}

export function calcularGananciaNeta(ingreso: number, costoCombustible: number): number {
  return redondear(ingreso - costoCombustible);
}

export function resumirIndicadores(viajes: Viaje[]): ResumenIndicadores {
  const kilometros = viajes.reduce((total, viaje) => total + viaje.distanciaKm, 0);
  const ingresos = viajes.reduce((total, viaje) => total + viaje.ingreso, 0);
  const combustible = viajes.reduce((total, viaje) => total + viaje.costoCombustible, 0);
  const ganancia = viajes.reduce((total, viaje) => total + viaje.gananciaNeta, 0);

  return {
    kilometros: redondear(kilometros),
    ingresos: redondear(ingresos),
    combustible: redondear(combustible),
    ganancia: redondear(ganancia),
    ingresoPorKm: kilometros > 0 ? redondear(ingresos / kilometros) : 0,
  };
}

function gradosARadianes(valor: number): number {
  return (valor * Math.PI) / 180;
}
