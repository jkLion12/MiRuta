import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Viaje } from '../modelos/viaje.model';
import { resumenDeViajes } from '../utilidades/calculos-viaje';
import { AlmacenamientoService } from './almacenamiento.service';

const CLAVE_VIAJES = 'viajes';

@Injectable({ providedIn: 'root' })
export class ViajesService {
  private readonly estado = new BehaviorSubject<Viaje[]>([]);
  readonly viajes$ = this.estado.asObservable();

  constructor(private readonly almacenamiento: AlmacenamientoService) {}

  async cargar(): Promise<Viaje[]> {
    const viajes = await this.almacenamiento.obtener<Viaje[]>(CLAVE_VIAJES, []);
    const ordenados = viajes.sort(
      (a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime(),
    );
    this.estado.next(ordenados);
    return ordenados;
  }

  actuales(): Viaje[] {
    return this.estado.value;
  }

  async crear(viaje: Omit<Viaje, 'id'>): Promise<Viaje> {
    const nuevo: Viaje = {
      ...viaje,
      id: crypto.randomUUID?.() ?? Date.now().toString(),
    };
    await this.persistir([nuevo, ...this.estado.value]);
    return nuevo;
  }

  async actualizar(viaje: Viaje): Promise<void> {
    await this.persistir(this.estado.value.map((item) => (item.id === viaje.id ? viaje : item)));
  }

  async eliminar(id: string): Promise<void> {
    await this.persistir(this.estado.value.filter((viaje) => viaje.id !== id));
  }

  porId(id: string): Viaje | undefined {
    return this.estado.value.find((viaje) => viaje.id === id);
  }

  resumen(desde?: string, hasta?: string) {
    return resumenDeViajes(this.filtrarPorFecha(desde, hasta));
  }

  filtrarPorFecha(desde?: string, hasta?: string): Viaje[] {
    return this.estado.value.filter((viaje) => {
      const tiempo = new Date(viaje.fechaInicio).getTime();
      const inicio = desde ? new Date(`${desde}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
      const fin = hasta ? new Date(`${hasta}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
      return tiempo >= inicio && tiempo <= fin;
    });
  }

  exportarCsv(): string {
    const filas = [
      ['Fecha', 'Tipo', 'Origen', 'Destino', 'Km', 'Duracion segundos', 'Ingreso', 'Combustible', 'Ganancia', 'Notas'],
      ...this.estado.value.map((viaje) => [
        viaje.fechaInicio,
        viaje.tipo,
        viaje.origen,
        viaje.destino,
        viaje.distanciaKm.toFixed(3),
        viaje.duracionSegundos.toString(),
        viaje.ingreso.toFixed(2),
        viaje.costoCombustible.toFixed(2),
        (viaje.ingreso - viaje.costoCombustible).toFixed(2),
        viaje.notas ?? '',
      ]),
    ];

    return filas
      .map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  private async persistir(viajes: Viaje[]): Promise<void> {
    const ordenados = viajes.sort(
      (a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime(),
    );
    await this.almacenamiento.guardar(CLAVE_VIAJES, ordenados);
    this.estado.next(ordenados);
  }
}
