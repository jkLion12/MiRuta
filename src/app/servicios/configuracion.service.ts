import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  CONFIGURACION_DEFECTO,
  ConfiguracionApp,
  TemaApp,
} from '../modelos/configuracion.model';
import { AlmacenamientoService } from './almacenamiento.service';

const CLAVE_CONFIGURACION = 'configuracion';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly estado = new BehaviorSubject<ConfiguracionApp>(CONFIGURACION_DEFECTO);
  readonly configuracion$ = this.estado.asObservable();

  constructor(private readonly almacenamiento: AlmacenamientoService) {}

  async cargar(): Promise<ConfiguracionApp> {
    const configuracion = await this.almacenamiento.obtener<ConfiguracionApp>(
      CLAVE_CONFIGURACION,
      CONFIGURACION_DEFECTO,
    );
    this.estado.next({ ...CONFIGURACION_DEFECTO, ...configuracion });
    this.aplicarTema(this.estado.value.tema);
    return this.estado.value;
  }

  async aplicarTemaInicial(): Promise<void> {
    await this.cargar();
  }

  actual(): ConfiguracionApp {
    return this.estado.value;
  }

  async guardar(configuracion: ConfiguracionApp): Promise<void> {
    const normalizada = { ...CONFIGURACION_DEFECTO, ...configuracion };
    await this.almacenamiento.guardar(CLAVE_CONFIGURACION, normalizada);
    this.estado.next(normalizada);
    this.aplicarTema(normalizada.tema);
  }

  aplicarTema(tema: TemaApp): void {
    const oscuro =
      tema === 'oscuro' ||
      (tema === 'automatico' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', oscuro);
    document.body.classList.toggle('dark', oscuro);
  }
}
