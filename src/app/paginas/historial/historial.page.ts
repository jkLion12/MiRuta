import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';

import { Viaje } from '../../modelos/viaje.model';
import { ConfiguracionService } from '../../servicios/configuracion.service';
import { ViajesService } from '../../servicios/viajes.service';
import { dinero, fechaCorta, kilometros } from '../../utilidades/formato';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './historial.page.html',
  styleUrl: './historial.page.scss',
})
export class HistorialPage implements OnInit {
  viajes: Viaje[] = [];

  constructor(
    private readonly viajesService: ViajesService,
    private readonly configuracion: ConfiguracionService,
    private readonly router: Router,
    private readonly alertas: AlertController,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.configuracion.cargar();
    await this.cargar();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  abrir(id: string): void {
    void this.router.navigate(['/tabs/historial', id]);
  }

  async eliminar(id: string, evento: Event): Promise<void> {
    evento.stopPropagation();
    const alerta = await this.alertas.create({
      header: 'Eliminar viaje',
      message: 'Esta accion no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alerta.present();
    const resultado = await alerta.onDidDismiss();
    if (resultado.role === 'destructive') {
      await this.viajesService.eliminar(id);
      await this.cargar();
    }
  }

  dinero(valor: number): string {
    return dinero(valor, this.configuracion.actual().moneda);
  }

  km(valor: number): string {
    return kilometros(valor);
  }

  fecha(fecha: string): string {
    return fechaCorta(fecha);
  }

  private async cargar(): Promise<void> {
    this.viajes = await this.viajesService.cargar();
  }
}
