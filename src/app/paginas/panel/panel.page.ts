import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';

import { ConfiguracionService } from '../../servicios/configuracion.service';
import { ViajesService } from '../../servicios/viajes.service';
import { ResumenViajes, Viaje } from '../../modelos/viaje.model';
import { dinero, kilometros } from '../../utilidades/formato';
import { resumenDeViajes } from '../../utilidades/calculos-viaje';
import { AlmacenamientoService } from '../../servicios/almacenamiento.service';

const CLAVE_META_HOY = 'meta_ganancia_hoy';

interface DiaGrafico {
  clave: string;
  etiqueta: string;
  ingresos: number;
  km: number;
  combustible: number;
  ganancia: number;
  porcentajeIngresos: number;
  porcentajeKm: number;
  porcentajeGanancia: number;
  porcentajeCombustible: number;
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
  metaHoy = 100;
  gananciaHoy = 0;
  ingresoHoy = 0;
  progresoMeta = 0;
  faltaMeta = 0;
  mejorDia: DiaGrafico | null = null;
  resumen: ResumenViajes = resumenDeViajes([]);
  ultimosSieteDias: DiaGrafico[] = [];

  constructor(
    private readonly viajes: ViajesService,
    private readonly configuracion: ConfiguracionService,
    private readonly almacenamiento: AlmacenamientoService,
    private readonly toast: ToastController,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.configuracion.cargar();
    this.metaHoy = await this.almacenamiento.obtener<number>(CLAVE_META_HOY, 100);
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
    this.ultimosSieteDias = this.crearUltimosSieteDias(this.viajes.actuales());
    this.gananciaHoy = this.ultimosSieteDias[this.ultimosSieteDias.length - 1]?.ganancia ?? 0;
    this.ingresoHoy = this.ultimosSieteDias[this.ultimosSieteDias.length - 1]?.ingresos ?? 0;
    this.progresoMeta = this.metaHoy > 0 ? Math.min(100, Math.max(0, (this.gananciaHoy / this.metaHoy) * 100)) : 0;
    this.faltaMeta = Math.max(0, this.metaHoy - this.gananciaHoy);
    this.mejorDia =
      [...this.ultimosSieteDias].sort((a, b) => b.ganancia - a.ganancia)[0] ?? null;
  }

  limpiar(): void {
    this.desde = '';
    this.hasta = '';
    this.actualizar();
  }

  async guardarMeta(): Promise<void> {
    this.metaHoy = Number(this.metaHoy) || 0;
    await this.almacenamiento.guardar(CLAVE_META_HOY, this.metaHoy);
    this.actualizar();
    const aviso = await this.toast.create({
      message: 'Meta de hoy guardada.',
      duration: 1400,
      position: 'bottom',
    });
    await aviso.present();
  }

  get metaCumplida(): boolean {
    return this.metaHoy > 0 && this.gananciaHoy >= this.metaHoy;
  }

  get avanceMetaConico(): string {
    return `conic-gradient(var(--app-rojo) ${this.progresoMeta}%, var(--app-superficie-2) 0)`;
  }

  dinero(valor: number): string {
    return dinero(valor, this.configuracion.actual().moneda);
  }

  km(valor: number): string {
    return kilometros(valor);
  }

  private crearUltimosSieteDias(viajes: Viaje[]): DiaGrafico[] {
    const dias = new Map<string, DiaGrafico>();
    const hoy = new Date();

    for (let indice = 6; indice >= 0; indice--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - indice);
      const clave = this.claveFecha(fecha);
      dias.set(clave, {
        clave,
        etiqueta: fecha.toLocaleDateString('es-PE', { weekday: 'short' }),
        ingresos: 0,
        km: 0,
        combustible: 0,
        ganancia: 0,
        porcentajeIngresos: 0,
        porcentajeKm: 0,
        porcentajeGanancia: 0,
        porcentajeCombustible: 0,
      });
    }

    viajes.forEach((viaje) => {
      const clave = this.claveFecha(new Date(viaje.fechaInicio));
      const dia = dias.get(clave);
      if (!dia) {
        return;
      }

      dia.ingresos += viaje.ingreso;
      dia.km += viaje.distanciaKm;
      dia.combustible += viaje.costoCombustible;
      dia.ganancia += viaje.ingreso - viaje.costoCombustible;
    });

    const lista = Array.from(dias.values());
    const maxIngresos = Math.max(...lista.map((dia) => dia.ingresos), 0);
    const maxKm = Math.max(...lista.map((dia) => dia.km), 0);
    const maxGanancia = Math.max(...lista.map((dia) => Math.max(0, dia.ganancia)), 0);
    const maxCombustible = Math.max(...lista.map((dia) => dia.combustible), 0);

    return lista.map((dia) => ({
      ...dia,
      porcentajeIngresos: this.porcentaje(dia.ingresos, maxIngresos),
      porcentajeKm: this.porcentaje(dia.km, maxKm),
      porcentajeGanancia: this.porcentaje(Math.max(0, dia.ganancia), maxGanancia),
      porcentajeCombustible: this.porcentaje(dia.combustible, maxCombustible),
    }));
  }

  private porcentaje(valor: number, maximo: number): number {
    if (maximo <= 0 || valor <= 0) {
      return 0;
    }

    return Math.max(7, (valor / maximo) * 100);
  }

  private claveFecha(fecha: Date): string {
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const dia = `${fecha.getDate()}`.padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
