import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({ providedIn: 'root' })
export class AlmacenamientoService {
  private listo: Promise<void>;

  constructor(private readonly storage: Storage) {
    this.listo = this.inicializar();
  }

  async obtener<T>(clave: string, valorPredeterminado: T): Promise<T> {
    await this.listo;
    const valor = await this.storage.get(clave);
    return (valor ?? valorPredeterminado) as T;
  }

  async guardar<T>(clave: string, valor: T): Promise<void> {
    await this.listo;
    await this.storage.set(clave, valor);
  }

  async eliminar(clave: string): Promise<void> {
    await this.listo;
    await this.storage.remove(clave);
  }

  private async inicializar(): Promise<void> {
    await this.storage.create();
  }
}
