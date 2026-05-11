import { PuntoRuta, ResumenViajes, Viaje } from '../modelos/viaje.model';

const RADIO_TIERRA_KM = 6371;

export function distanciaEntrePuntosKm(a: PuntoRuta, b: PuntoRuta): number {
  const dLat = gradosARadianes(b.lat - a.lat);
  const dLng = gradosARadianes(b.lng - a.lng);
  const lat1 = gradosARadianes(a.lat);
  const lat2 = gradosARadianes(b.lat);
  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * RADIO_TIERRA_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function distanciaRutaKm(puntos: PuntoRuta[]): number {
  return puntos.reduce((total, punto, indice) => {
    if (indice === 0) {
      return 0;
    }

    return total + distanciaEntrePuntosKm(puntos[indice - 1], punto);
  }, 0);
}

export function resumenDeViajes(viajes: Viaje[]): ResumenViajes {
  const totalKm = viajes.reduce((total, viaje) => total + viaje.distanciaKm, 0);
  const totalIngresos = viajes.reduce((total, viaje) => total + viaje.ingreso, 0);
  const totalCombustible = viajes.reduce((total, viaje) => total + viaje.costoCombustible, 0);
  const gananciaNeta = totalIngresos - totalCombustible;

  return {
    totalKm,
    totalIngresos,
    totalCombustible,
    gananciaNeta,
    ingresoPorKm: totalKm > 0 ? totalIngresos / totalKm : 0,
  };
}

export function estimarCombustible(distanciaKm: number, rendimientoKmLitro: number): number {
  if (rendimientoKmLitro <= 0) {
    return 0;
  }

  return distanciaKm / rendimientoKmLitro;
}

function gradosARadianes(valor: number): number {
  return (valor * Math.PI) / 180;
}
