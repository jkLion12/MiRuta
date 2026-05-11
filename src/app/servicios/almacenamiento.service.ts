import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({ providedIn: 'root' })
export class AlmacenamientoService {
  private listo: Promise<Storage>;

  constructor(private readonly storage: Storage) {
    this.listo = this.storage.create();
  }

  async obtener<T>(clave: string, defecto: T): Promise<T> {
    const storage = await this.listo;
    const valor = (await storage.get(clave)) as T | null;
    return valor ?? defecto;
  }

  async guardar<T>(clave: string, valor: T): Promise<void> {
    const storage = await this.listo;
    await storage.set(clave, valor);
  }
}
