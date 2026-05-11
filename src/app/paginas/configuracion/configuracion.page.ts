import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';

import { CONFIGURACION_DEFECTO, ConfiguracionApp } from '../../modelos/configuracion.model';
import { ConfiguracionService } from '../../servicios/configuracion.service';
import { ViajesService } from '../../servicios/viajes.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule, IonicModule],
  templateUrl: './configuracion.page.html',
  styleUrl: './configuracion.page.scss',
})
export class ConfiguracionPage implements OnInit {
  configuracion: ConfiguracionApp = { ...CONFIGURACION_DEFECTO };

  constructor(
    private readonly configuracionService: ConfiguracionService,
    private readonly viajes: ViajesService,
    private readonly toast: ToastController,
  ) {}

  async ngOnInit(): Promise<void> {
    this.configuracion = { ...(await this.configuracionService.cargar()) };
  }

  async guardar(): Promise<void> {
    await this.configuracionService.guardar({
      ...this.configuracion,
      rendimientoKmLitro: Number(this.configuracion.rendimientoKmLitro) || 25,
      precioLitro: Number(this.configuracion.precioLitro) || 0,
    });
    await this.mostrarToast('Ajustes guardados.');
  }

  async exportarCsv(): Promise<void> {
    await this.viajes.cargar();
    const csv = this.viajes.exportarCsv();
    const archivo = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `miruta-viajes-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
    await this.mostrarToast('CSV generado.');
  }

  private async mostrarToast(message: string): Promise<void> {
    const toast = await this.toast.create({
      message,
      duration: 1600,
      position: 'bottom',
    });
    await toast.present();
  }
}
