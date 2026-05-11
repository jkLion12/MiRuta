import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { MapaRutaComponent } from '../../componentes/mapa-ruta/mapa-ruta.component';
import { Viaje } from '../../modelos/viaje.model';
import { ConfiguracionService } from '../../servicios/configuracion.service';
import { ViajesService } from '../../servicios/viajes.service';
import { formatearDuracion, formatearFecha, formatearMoneda } from '../../utilidades/formato';

@Component({
  selector: 'app-detalle-viaje',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, MapaRutaComponent],
  templateUrl: './detalle-viaje.page.html',
  styleUrls: ['./detalle-viaje.page.scss'],
})
export class DetalleViajePage {
  readonly viaje = computed(() => this.viajesService.obtenerViajePorId(this.route.snapshot.paramMap.get('id') ?? ''));

  readonly formulario = this.fb.group({
    origen: ['', Validators.required],
    destino: ['', Validators.required],
    distanciaKm: [0, [Validators.required, Validators.min(0.1)]],
    duracionSegundos: [0, [Validators.required, Validators.min(60)]],
    ingreso: [0, [Validators.required, Validators.min(0)]],
    costoCombustible: [0, [Validators.required, Validators.min(0)]],
    notas: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly configuracionService: ConfiguracionService,
    public readonly viajesService: ViajesService,
    private readonly toastController: ToastController,
  ) {
    const viaje = this.viaje();
    if (viaje) {
      this.cargarFormulario(viaje);
    }
  }

  formatearFecha(valor: string): string {
    return formatearFecha(valor);
  }

  formatearDuracion(valor: number): string {
    return formatearDuracion(valor);
  }

  formatearMoneda(valor: number): string {
    return formatearMoneda(valor, this.configuracionService.configuracion().moneda);
  }

  async guardarCambios(): Promise<void> {
    const original = this.viaje();
    if (!original || this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valor = this.formulario.getRawValue();
    const viajeActualizado: Viaje = {
      ...original,
      origen: valor.origen ?? '',
      destino: valor.destino ?? '',
      distanciaKm: Number(valor.distanciaKm ?? 0),
      duracionSegundos: Number(valor.duracionSegundos ?? 0),
      ingreso: Number(valor.ingreso ?? 0),
      costoCombustible: Number(valor.costoCombustible ?? 0),
      gananciaNeta: Number((Number(valor.ingreso ?? 0) - Number(valor.costoCombustible ?? 0)).toFixed(2)),
      notas: valor.notas ?? '',
    };

    await this.viajesService.actualizarViaje(viajeActualizado);
    const toast = await this.toastController.create({
      message: 'Cambios guardados.',
      duration: 1800,
      position: 'top',
    });
    await toast.present();
  }

  volver(): void {
    void this.router.navigateByUrl('/historial');
  }

  private cargarFormulario(viaje: Viaje): void {
    this.formulario.patchValue({
      origen: viaje.origen,
      destino: viaje.destino,
      distanciaKm: viaje.distanciaKm,
      duracionSegundos: viaje.duracionSegundos,
      ingreso: viaje.ingreso,
      costoCombustible: viaje.costoCombustible,
      notas: viaje.notas ?? '',
    });
  }
}
