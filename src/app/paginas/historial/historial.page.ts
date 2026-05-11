import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { ConfiguracionService } from '../../servicios/configuracion.service';
import { ViajesService } from '../../servicios/viajes.service';
import { formatearFecha, formatearMoneda } from '../../utilidades/formato';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
})
export class HistorialPage {
  constructor(
    public readonly configuracionService: ConfiguracionService,
    public readonly viajesService: ViajesService,
    private readonly alertController: AlertController,
  ) {}

  formatearFecha(valor: string): string {
    return formatearFecha(valor);
  }

  formatearMoneda(valor: number): string {
    return formatearMoneda(valor, this.configuracionService.configuracion().moneda);
  }

  async confirmarEliminacion(id: string): Promise<void> {
    const alerta = await this.alertController.create({
      header: 'Eliminar viaje',
      message: 'Este registro se borrará del historial local.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            void this.viajesService.eliminarViaje(id);
          },
        },
      ],
    });
    await alerta.present();
  }
}
