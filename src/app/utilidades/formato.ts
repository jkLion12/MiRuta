export function dinero(valor: number, moneda: string): string {
  return `${moneda} ${valor.toFixed(2)}`;
}

export function kilometros(valor: number): string {
  return `${valor.toFixed(valor >= 10 ? 1 : 2)} km`;
}

export function duracion(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const seg = segundos % 60;

  return [horas, minutos, seg].map((parte) => parte.toString().padStart(2, '0')).join(':');
}

export function fechaCorta(fechaIso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fechaIso));
}
