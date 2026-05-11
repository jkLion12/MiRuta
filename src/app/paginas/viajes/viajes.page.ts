import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';

import { MapaRutaComponent, CapaMapa } from '../../componentes/mapa-ruta/mapa-ruta.component';
import { PuntoRuta } from '../../modelos/viaje.model';
import { ConfiguracionService } from '../../servicios/configuracion.service';
import { UbicacionService } from '../../servicios/ubicacion.service';
import { ViajesService } from '../../servicios/viajes.service';
import { distanciaRutaKm, estimarCombustible } from '../../utilidades/calculos-viaje';
import { dinero, duracion, kilometros } from '../../utilidades/formato';

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, MapaRutaComponent],
  templateUrl: './viajes.page.html',
  styleUrl: './viajes.page.scss',
})
export class ViajesPage implements OnInit, OnDestroy {
  modo: 'vivo' | 'manual' = 'vivo';
  capa: CapaMapa = 'calles';
  activo = false;
  seguirCentro = true;
  puntos: PuntoRuta[] = [];
  centroActual: PuntoRuta | null = null;
  mensaje = '';
  distanciaKm = 0;
  duracionSegundos = 0;
  ingresoAcumulado = 0;
  pagoParcial: number | null = null;
  inicioMs = 0;
  temporizador?: ReturnType<typeof setInterval>;

  manual = {
    origen: '',
    destino: '',
    distanciaKm: 0,
    duracionMinutos: 0,
    ingreso: 0,
    costoCombustible: 0,
    notas: '',
  };

  constructor(
    private readonly ubicacion: UbicacionService,
    private readonly viajes: ViajesService,
    private readonly configuracion: ConfiguracionService,
    private readonly alertas: AlertController,
    private readonly toast: ToastController,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.configuracion.cargar();
    await this.viajes.cargar();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.centrarEnMiUbicacion();
  }

  async ngOnDestroy(): Promise<void> {
    await this.ubicacion.detenerSeguimiento();
    this.detenerCronometro();
  }

  get duracionTexto(): string {
    return duracion(this.duracionSegundos);
  }

  get litrosEstimados(): number {
    return estimarCombustible(this.distanciaKm, this.configuracion.actual().rendimientoKmLitro);
  }

  async centrarEnMiUbicacion(): Promise<void> {
    this.mensaje = 'Buscando tu ubicacion...';
    this.seguirCentro = true;
    try {
      const punto = await this.ubicacion.obtenerActual();
      this.centroActual = punto;
      if (!this.activo && this.puntos.length === 0) {
        this.puntos = [punto];
      }
      this.mensaje = `Ubicacion detectada. Precision aprox: ${Math.round(punto.precision ?? 0)} m`;
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : 'No fue posible obtener tu ubicacion actual.';
    }
  }

  async iniciarViaje(): Promise<void> {
    this.mensaje = 'Activando GPS...';
    try {
      const inicial = await this.ubicacion.obtenerActual();
      this.activo = true;
      this.inicioMs = Date.now();
      this.duracionSegundos = 0;
      this.distanciaKm = 0;
      this.ingresoAcumulado = 0;
      this.puntos = [inicial];
      this.centroActual = inicial;
      this.seguirCentro = true;
      this.iniciarCronometro();

      await this.ubicacion.iniciarSeguimiento(
        (punto) => this.recibirPunto(punto),
        (mensaje) => {
          this.mensaje = mensaje;
        },
      );

      this.mensaje = 'GPS activo. Mantén la app abierta durante el viaje.';
    } catch (error) {
      this.activo = false;
      this.mensaje = error instanceof Error ? error.message : 'No fue posible iniciar el GPS.';
    }
  }

  async finalizarViaje(): Promise<void> {
    await this.ubicacion.detenerSeguimiento();
    this.detenerCronometro();
    this.activo = false;

    const alerta = await this.alertas.create({
      header: 'Finalizar viaje',
      inputs: [
        {
          name: 'ingreso',
          type: 'number',
          placeholder: 'Ingreso total',
          value: this.ingresoAcumulado.toString(),
        },
        {
          name: 'litros',
          type: 'number',
          placeholder: 'Litros cargados opcional',
        },
        {
          name: 'combustible',
          type: 'number',
          placeholder: 'Costo real combustible',
          value: this.costoCombustibleEstimado().toFixed(2),
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Guardar', role: 'confirm' },
      ],
    });
    await alerta.present();
    const resultado = await alerta.onDidDismiss<{
      values?: { ingreso?: string; litros?: string; combustible?: string };
    }>();

    if (resultado.role !== 'confirm') {
      return;
    }

    const valores = resultado.data?.values;
    const ingreso = Number(valores?.ingreso ?? this.ingresoAcumulado);
    const costoCombustible = Number(valores?.combustible ?? this.costoCombustibleEstimado());
    const litros = Number(valores?.litros ?? 0);
    const ahora = new Date().toISOString();
    const origen = this.puntos[0];
    const destino = this.puntos[this.puntos.length - 1];

    await this.viajes.crear({
      tipo: 'gps',
      fechaInicio: new Date(this.inicioMs).toISOString(),
      fechaFin: ahora,
      origen: origen ? `${origen.lat.toFixed(5)}, ${origen.lng.toFixed(5)}` : 'Sin origen',
      destino: destino ? `${destino.lat.toFixed(5)}, ${destino.lng.toFixed(5)}` : 'Sin destino',
      distanciaKm: this.distanciaKm,
      duracionSegundos: this.duracionSegundos,
      ingreso: Number.isFinite(ingreso) ? ingreso : 0,
      costoCombustible: Number.isFinite(costoCombustible) ? costoCombustible : 0,
      litrosCargados: Number.isFinite(litros) && litros > 0 ? litros : undefined,
      ruta: this.puntos,
    });

    this.puntos = destino ? [destino] : [];
    this.distanciaKm = 0;
    this.duracionSegundos = 0;
    this.ingresoAcumulado = 0;
    await this.mostrarToast('Viaje guardado en el celular.');
  }

  agregarPago(): void {
    const monto = Number(this.pagoParcial ?? 0);
    if (Number.isFinite(monto) && monto > 0) {
      this.ingresoAcumulado += monto;
      this.pagoParcial = null;
    }
  }

  async guardarManual(): Promise<void> {
    const ahora = new Date().toISOString();
    await this.viajes.crear({
      tipo: 'manual',
      fechaInicio: ahora,
      fechaFin: ahora,
      origen: this.manual.origen || 'Origen manual',
      destino: this.manual.destino || 'Destino manual',
      distanciaKm: Number(this.manual.distanciaKm) || 0,
      duracionSegundos: (Number(this.manual.duracionMinutos) || 0) * 60,
      ingreso: Number(this.manual.ingreso) || 0,
      costoCombustible: Number(this.manual.costoCombustible) || 0,
      ruta: [],
      notas: this.manual.notas,
    });
    this.manual = {
      origen: '',
      destino: '',
      distanciaKm: 0,
      duracionMinutos: 0,
      ingreso: 0,
      costoCombustible: 0,
      notas: '',
    };
    await this.mostrarToast('Viaje manual guardado.');
  }

  dinero(valor: number): string {
    return dinero(valor, this.configuracion.actual().moneda);
  }

  km(valor: number): string {
    return kilometros(valor);
  }

  private recibirPunto(punto: PuntoRuta): void {
    if ((punto.precision ?? 0) > 100 && this.puntos.length > 0) {
      this.mensaje = `Esperando mejor precision GPS (${Math.round(punto.precision ?? 0)} m).`;
      return;
    }

    this.puntos = [...this.puntos, punto];
    this.centroActual = punto;
    this.distanciaKm = distanciaRutaKm(this.puntos);
    this.mensaje = `GPS activo. Precision aprox: ${Math.round(punto.precision ?? 0)} m`;
  }

  private iniciarCronometro(): void {
    this.detenerCronometro();
    this.temporizador = setInterval(() => {
      this.duracionSegundos = Math.floor((Date.now() - this.inicioMs) / 1000);
    }, 1000);
  }

  private detenerCronometro(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = undefined;
    }
  }

  private costoCombustibleEstimado(): number {
    return this.litrosEstimados * this.configuracion.actual().precioLitro;
  }

  private async mostrarToast(message: string): Promise<void> {
    const toast = await this.toast.create({
      message,
      duration: 1800,
      position: 'bottom',
    });
    await toast.present();
  }
}
