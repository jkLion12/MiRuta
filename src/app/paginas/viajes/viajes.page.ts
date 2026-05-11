import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { MapaRutaComponent } from '../../componentes/mapa-ruta/mapa-ruta.component';
import { ConfiguracionService } from '../../servicios/configuracion.service';
import { UbicacionService } from '../../servicios/ubicacion.service';
import { ViajesService } from '../../servicios/viajes.service';
import {
  etiquetaUnidadDistancia,
  formatearDuracion,
  formatearMoneda,
} from '../../utilidades/formato';

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, MapaRutaComponent],
  templateUrl: './viajes.page.html',
  styleUrls: ['./viajes.page.scss'],
})
export class ViajesPage {
  readonly segmento = signal<'gps' | 'manual'>('gps');
  readonly mostrarFormularioCierre = signal(false);
  readonly tiempoActual = signal(Date.now());

  readonly formularioManual = this.fb.group({
    origen: ['', Validators.required],
    destino: ['', Validators.required],
    distanciaKm: [0, [Validators.required, Validators.min(0.1)]],
    duracionMinutos: [30, [Validators.required, Validators.min(1)]],
    ingreso: [0, [Validators.required, Validators.min(0)]],
    combustibleRealLitros: [0],
    costoCombustible: [0],
    notas: [''],
  });

  readonly formularioCierre = this.fb.group({
    ingresoFinal: [0, [Validators.min(0)]],
    combustibleRealLitros: [0],
    costoCombustible: [0],
    notas: [''],
  });

  readonly formularioIngresoParcial = this.fb.group({
    monto: [0, [Validators.required, Validators.min(1)]],
  });

  readonly duracionActual = computed(() => {
    const activo = this.viajesService.viajeActivo();
    if (!activo) {
      return '00:00:00';
    }
    const segundos = Math.floor((this.tiempoActual() - new Date(activo.fechaInicio).getTime()) / 1000);
    return formatearDuracion(Math.max(0, segundos));
  });

  constructor(
    private readonly fb: FormBuilder,
    public readonly configuracionService: ConfiguracionService,
    public readonly ubicacionService: UbicacionService,
    public readonly viajesService: ViajesService,
    private readonly toastController: ToastController,
  ) {
    setInterval(() => this.tiempoActual.set(Date.now()), 1000);
  }

  cambiarSegmento(valor: 'gps' | 'manual'): void {
    this.segmento.set(valor);
  }

  manejarCambioSegmento(valor: string | number | null | undefined): void {
    this.segmento.set(valor === 'manual' ? 'manual' : 'gps');
  }

  async iniciarViaje(): Promise<void> {
    await this.viajesService.iniciarViaje();
    await this.mostrarToast('Viaje iniciado. El GPS ya está registrando la ruta.');
  }

  async agregarIngresoParcial(): Promise<void> {
    const monto = Number(this.formularioIngresoParcial.value.monto ?? 0);
    await this.viajesService.agregarIngresoParcial(monto);
    this.formularioIngresoParcial.patchValue({ monto: 0 });
    await this.mostrarToast('Ingreso parcial agregado.');
  }

  async finalizarViaje(): Promise<void> {
    if (!this.mostrarFormularioCierre()) {
      this.mostrarFormularioCierre.set(true);
      return;
    }

    const valor = this.formularioCierre.getRawValue();
    const viaje = await this.viajesService.finalizarViaje({
      ingresoFinal: Number(valor.ingresoFinal ?? 0),
      combustibleRealLitros: this.numeroOpcional(valor.combustibleRealLitros),
      costoCombustible: this.numeroOpcional(valor.costoCombustible),
      notas: valor.notas ?? '',
    });

    if (viaje) {
      this.mostrarFormularioCierre.set(false);
      this.formularioCierre.reset({
        ingresoFinal: 0,
        combustibleRealLitros: 0,
        costoCombustible: 0,
        notas: '',
      });
      await this.mostrarToast('Viaje finalizado y guardado correctamente.');
    }
  }

  async registrarViajeManual(): Promise<void> {
    if (this.formularioManual.invalid) {
      this.formularioManual.markAllAsTouched();
      return;
    }

    const valor = this.formularioManual.getRawValue();
    await this.viajesService.registrarViajeManual({
      origen: valor.origen ?? '',
      destino: valor.destino ?? '',
      distanciaKm: Number(valor.distanciaKm ?? 0),
      duracionSegundos: Number(valor.duracionMinutos ?? 0) * 60,
      ingreso: Number(valor.ingreso ?? 0),
      combustibleRealLitros: this.numeroOpcional(valor.combustibleRealLitros),
      costoCombustible: this.numeroOpcional(valor.costoCombustible),
      notas: valor.notas ?? '',
    });

    this.formularioManual.reset({
      origen: '',
      destino: '',
      distanciaKm: 0,
      duracionMinutos: 30,
      ingreso: 0,
      combustibleRealLitros: 0,
      costoCombustible: 0,
      notas: '',
    });

    await this.mostrarToast('Viaje manual guardado.');
  }

  unidadDistancia(): string {
    return etiquetaUnidadDistancia(this.configuracionService.configuracion().unidadDistancia);
  }

  formatearMoneda(valor: number): string {
    return formatearMoneda(valor, this.configuracionService.configuracion().moneda);
  }

  private numeroOpcional(valor: unknown): number | undefined {
    const numero = Number(valor ?? 0);
    return numero > 0 ? numero : undefined;
  }

  private async mostrarToast(mensaje: string): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 1800,
      position: 'top',
    });
    await toast.present();
  }
}
