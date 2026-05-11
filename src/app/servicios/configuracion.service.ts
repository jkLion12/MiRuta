import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import {
  CONFIGURACION_PREDETERMINADA,
  ConfiguracionAplicacion,
  TemaAplicacion,
} from '../modelos/configuracion.model';
import { AlmacenamientoService } from './almacenamiento.service';

const CLAVE_CONFIGURACION = 'configuracion_app';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly document = inject(DOCUMENT);
  readonly configuracion = signal<ConfiguracionAplicacion>(CONFIGURACION_PREDETERMINADA);
  readonly cargado = signal(false);

  constructor(private readonly almacenamiento: AlmacenamientoService) {
    void this.cargar();
  }

  async actualizar(configuracionParcial: Partial<ConfiguracionAplicacion>): Promise<void> {
    const nuevaConfiguracion = {
      ...this.configuracion(),
      ...configuracionParcial,
    };
    this.configuracion.set(nuevaConfiguracion);
    this.aplicarTema(nuevaConfiguracion.tema);
    await this.almacenamiento.guardar(CLAVE_CONFIGURACION, nuevaConfiguracion);
  }

  private async cargar(): Promise<void> {
    const configuracion = await this.almacenamiento.obtener(
      CLAVE_CONFIGURACION,
      CONFIGURACION_PREDETERMINADA,
    );
    this.configuracion.set({ ...CONFIGURACION_PREDETERMINADA, ...configuracion });
    this.aplicarTema(this.configuracion().tema);
    this.cargado.set(true);
  }

  private aplicarTema(tema: TemaAplicacion): void {
    const body = this.document.body;
    const usarOscuro =
      tema === 'oscuro' ||
      (tema === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    body.classList.toggle('tema-oscuro', usarOscuro);
    body.classList.toggle('tema-claro', !usarOscuro);
  }
}
