import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { MetaDiaria } from '../modelos/meta-diaria.model';
import { AlmacenamientoService } from './almacenamiento.service';

const CLAVE_METAS_DIARIAS = 'metas_diarias';

@Injectable({ providedIn: 'root' })
export class MetasDiariasService {
  private readonly estado = new BehaviorSubject<MetaDiaria[]>([]);
  readonly metas$ = this.estado.asObservable();

  constructor(private readonly almacenamiento: AlmacenamientoService) {}

  async cargar(): Promise<MetaDiaria[]> {
    const metas = await this.almacenamiento.obtener<MetaDiaria[]>(CLAVE_METAS_DIARIAS, []);
    const ordenadas = metas.sort((a, b) => b.fecha.localeCompare(a.fecha));
    this.estado.next(ordenadas);
    return ordenadas;
  }

  actuales(): MetaDiaria[] {
    return this.estado.value;
  }

  metaPorFecha(fecha: string): MetaDiaria | undefined {
    return this.estado.value.find((meta) => meta.fecha === fecha);
  }

  async guardarMeta(fecha: string, monto: number): Promise<MetaDiaria> {
    const ahora = new Date().toISOString();
    const existente = this.metaPorFecha(fecha);
    const meta: MetaDiaria = {
      fecha,
      meta: Math.max(0, Number(monto) || 0),
      creadaEn: existente?.creadaEn ?? ahora,
      actualizadaEn: ahora,
    };
    const siguiente = existente
      ? this.estado.value.map((item) => (item.fecha === fecha ? meta : item))
      : [meta, ...this.estado.value];

    await this.persistir(siguiente);
    return meta;
  }

  private async persistir(metas: MetaDiaria[]): Promise<void> {
    const ordenadas = metas.sort((a, b) => b.fecha.localeCompare(a.fecha));
    await this.almacenamiento.guardar(CLAVE_METAS_DIARIAS, ordenadas);
    this.estado.next(ordenadas);
  }
}
