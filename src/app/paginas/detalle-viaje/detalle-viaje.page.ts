import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { MapaRutaComponent, CapaMapa } from '../../componentes/mapa-ruta/mapa-ruta.component';
import { Viaje } from '../../modelos/viaje.model';
import { ViajesService } from '../../servicios/viajes.service';

@Component({
  selector: 'app-detalle-viaje',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink, MapaRutaComponent],
  templateUrl: './detalle-viaje.page.html',
  styleUrl: './detalle-viaje.page.scss',
})
export class DetalleViajePage implements OnInit {
  viaje?: Viaje;
  capa: CapaMapa = 'calles';

  constructor(
    private readonly ruta: ActivatedRoute,
    private readonly viajes: ViajesService,
    private readonly toast: ToastController,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  async guardar(): Promise<void> {
    if (!this.viaje) {
      return;
    }

    await this.viajes.actualizar({
      ...this.viaje,
      distanciaKm: Number(this.viaje.distanciaKm) || 0,
      duracionSegundos: Number(this.viaje.duracionSegundos) || 0,
      ingreso: Number(this.viaje.ingreso) || 0,
      costoCombustible: Number(this.viaje.costoCombustible) || 0,
    });

    const toast = await this.toast.create({
      message: 'Cambios guardados.',
      duration: 1600,
      position: 'bottom',
    });
    await toast.present();
  }

  private async cargar(): Promise<void> {
    await this.viajes.cargar();
    const id = this.ruta.snapshot.paramMap.get('id');
    this.viaje = id ? this.viajes.porId(id) : undefined;
  }
}
