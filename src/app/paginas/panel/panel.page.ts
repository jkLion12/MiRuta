import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ConfiguracionService } from '../../servicios/configuracion.service';
import { ViajesService } from '../../servicios/viajes.service';
import { etiquetaUnidadDistancia, formatearMoneda } from '../../utilidades/formato';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './panel.page.html',
  styleUrls: ['./panel.page.scss'],
})
export class PanelPage {
  readonly fechaInicio = signal('');
  readonly fechaFin = signal('');

  readonly viajesFiltrados = computed(() =>
    this.viajesService.filtrarPorRango(this.fechaInicio() || undefined, this.fechaFin() || undefined),
  );
  readonly indicadores = computed(() => this.viajesService.obtenerIndicadores(this.viajesFiltrados()));
  readonly serieIngresos = computed(() => this.viajesService.generarSerie(this.viajesFiltrados(), 'ingreso'));
  readonly serieKm = computed(() => this.viajesService.generarSerie(this.viajesFiltrados(), 'distanciaKm'));
  readonly valorMaximoIngresos = computed(
    () => Math.max(...this.serieIngresos().map((item) => item.valor), 1),
  );
  readonly valorMaximoKm = computed(() => Math.max(...this.serieKm().map((item) => item.valor), 1));

  constructor(
    public readonly configuracionService: ConfiguracionService,
    public readonly viajesService: ViajesService,
  ) {}

  actualizarFechaInicio(evento: Event): void {
    this.fechaInicio.set((evento.target as HTMLInputElement).value);
  }

  actualizarFechaFin(evento: Event): void {
    this.fechaFin.set((evento.target as HTMLInputElement).value);
  }

  limpiarFiltros(): void {
    this.fechaInicio.set('');
    this.fechaFin.set('');
  }

  formatearMoneda(valor: number): string {
    return formatearMoneda(valor, this.configuracionService.configuracion().moneda);
  }

  unidadDistancia(): string {
    return etiquetaUnidadDistancia(this.configuracionService.configuracion().unidadDistancia);
  }

  porcentajeBarra(valor: number, maximo: number): number {
    return Math.max(12, (valor / maximo) * 100);
  }
}
