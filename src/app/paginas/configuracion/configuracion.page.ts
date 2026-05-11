import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ConfiguracionService } from '../../servicios/configuracion.service';
import { ViajesService } from '../../servicios/viajes.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.scss'],
})
export class ConfiguracionPage {
  readonly formulario = this.fb.group({
    rendimientoModo: ['km_l', Validators.required],
    rendimientoValor: [25, [Validators.required, Validators.min(0.1)]],
    precioCombustible: [18.5, [Validators.required, Validators.min(0)]],
    moneda: ['PEN', Validators.required],
    unidadDistancia: ['km', Validators.required],
    tema: ['oscuro', Validators.required],
  });

  constructor(
    private readonly fb: FormBuilder,
    public readonly configuracionService: ConfiguracionService,
    private readonly viajesService: ViajesService,
    private readonly toastController: ToastController,
  ) {
    this.formulario.patchValue(this.configuracionService.configuracion());
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valor = this.formulario.getRawValue();
    await this.configuracionService.actualizar({
      rendimientoModo: valor.rendimientoModo === 'l_100km' ? 'l_100km' : 'km_l',
      rendimientoValor: Number(valor.rendimientoValor ?? 0),
      precioCombustible: Number(valor.precioCombustible ?? 0),
      moneda: valor.moneda ?? 'PEN',
      unidadDistancia: valor.unidadDistancia === 'mi' ? 'mi' : 'km',
      tema: valor.tema === 'claro' || valor.tema === 'sistema' ? valor.tema : 'oscuro',
    });
    await this.mostrarToast('Configuración actualizada.');
  }

  async exportarCsv(): Promise<void> {
    const csv = this.viajesService.exportarCsv(this.configuracionService.configuracion());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `miruta-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
    await this.mostrarToast('CSV exportado.');
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
