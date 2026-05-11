import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ConfiguracionService } from '../../servicios/configuracion.service';
import { ViajesService } from '../../servicios/viajes.service';
import { ResumenViajes, Viaje } from '../../modelos/viaje.model';
import { dinero, kilometros } from '../../utilidades/formato';
import { resumenDeViajes } from '../../utilidades/calculos-viaje';

interface BarraDia {
  etiqueta: string;
  km: number;
  porcentaje: number;
}

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './panel.page.html',
  styleUrl: './panel.page.scss',
})
export class PanelPage implements OnInit {
  desde = '';
  hasta = '';
  resumen: ResumenViajes = resumenDeViajes([]);
  barras: BarraDia[] = [];

  constructor(
    private readonly viajes: ViajesService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.configuracion.cargar();
    await this.viajes.cargar();
    this.actualizar();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.viajes.cargar();
    this.actualizar();
  }

  actualizar(): void {
    const lista = this.viajes.filtrarPorFecha(this.desde || undefined, this.hasta || undefined);
    this.resumen = resumenDeViajes(lista);
    this.barras = this.crearBarras(lista);
  }

  limpiar(): void {
    this.desde = '';
    this.hasta = '';
    this.actualizar();
  }

  dinero(valor: number): string {
    return dinero(valor, this.configuracion.actual().moneda);
  }

  km(valor: number): string {
    return kilometros(valor);
  }

  private crearBarras(viajes: Viaje[]): BarraDia[] {
    const dias = new Map<string, number>();
    viajes.forEach((viaje) => {
      const fecha = new Date(viaje.fechaInicio);
      const clave = fecha.toLocaleDateString('es-PE', { weekday: 'short' });
      dias.set(clave, (dias.get(clave) ?? 0) + viaje.distanciaKm);
    });

    const maximo = Math.max(...dias.values(), 0);
    return Array.from(dias.entries()).map(([etiqueta, km]) => ({
      etiqueta,
      km,
      porcentaje: maximo > 0 ? Math.max(8, (km / maximo) * 100) : 0,
    }));
  }
}
