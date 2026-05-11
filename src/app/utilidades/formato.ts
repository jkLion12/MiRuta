import { UnidadDistancia } from '../modelos/configuracion.model';

export function formatearDuracion(totalSegundos: number): string {
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = Math.floor(totalSegundos % 60);

  return [horas, minutos, segundos].map((valor) => String(valor).padStart(2, '0')).join(':');
}

export function convertirDistancia(distanciaKm: number, unidad: UnidadDistancia): number {
  return unidad === 'mi' ? Number((distanciaKm * 0.621371).toFixed(2)) : distanciaKm;
}

export function etiquetaUnidadDistancia(unidad: UnidadDistancia): string {
  return unidad === 'mi' ? 'mi' : 'km';
}

export function formatearMoneda(valor: number, moneda: string): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatearFecha(fechaIso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fechaIso));
}
