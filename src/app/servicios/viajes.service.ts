import { Injectable, computed, signal } from '@angular/core';
import { ConfiguracionAplicacion } from '../modelos/configuracion.model';
import { SerieGrafico, Viaje, ViajeEnCurso } from '../modelos/viaje.model';
import {
  calcularCombustibleEstimado,
  calcularCostoCombustible,
  calcularDistanciaRuta,
  calcularGananciaNeta,
  resumirIndicadores,
  redondear,
} from '../utilidades/calculos-viaje';
import { AlmacenamientoService } from './almacenamiento.service';
import { ConfiguracionService } from './configuracion.service';
import { UbicacionService } from './ubicacion.service';

const CLAVE_VIAJES = 'viajes_registrados';
const CLAVE_VIAJE_ACTIVO = 'viaje_activo';

@Injectable({ providedIn: 'root' })
export class ViajesService {
  readonly viajes = signal<Viaje[]>([]);
  readonly viajeActivo = signal<ViajeEnCurso | null>(null);
  readonly cargado = signal(false);
  readonly totalViajes = computed(() => this.viajes().length);

  constructor(
    private readonly almacenamiento: AlmacenamientoService,
    private readonly configuracionService: ConfiguracionService,
    private readonly ubicacionService: UbicacionService,
  ) {
    void this.cargarDatos();

    this.ubicacionService.registrarObservador((puntos) => {
      const actual = this.viajeActivo();
      if (!actual) {
        return;
      }

      const configuracion = this.configuracionService.configuracion();
      const distanciaKm = calcularDistanciaRuta(puntos);
      const combustibleEstimadoLitros = calcularCombustibleEstimado(distanciaKm, configuracion);

      const actualizado: ViajeEnCurso = {
        ...actual,
        puntosRuta: puntos,
        distanciaKm,
        combustibleEstimadoLitros,
      };

      this.viajeActivo.set(actualizado);
      void this.almacenamiento.guardar(CLAVE_VIAJE_ACTIVO, actualizado);
    });
  }

  obtenerViajePorId(id: string): Viaje | undefined {
    return this.viajes().find((viaje) => viaje.id === id);
  }

  async iniciarViaje(): Promise<void> {
    const viaje: ViajeEnCurso = {
      id: crypto.randomUUID(),
      fechaInicio: new Date().toISOString(),
      distanciaKm: 0,
      ingresoAcumulado: 0,
      ingresosParciales: [],
      combustibleEstimadoLitros: 0,
      puntosRuta: [],
    };

    this.viajeActivo.set(viaje);
    await this.almacenamiento.guardar(CLAVE_VIAJE_ACTIVO, viaje);
    await this.ubicacionService.iniciarSeguimiento();
  }

  async agregarIngresoParcial(monto: number): Promise<void> {
    const actual = this.viajeActivo();
    if (!actual || monto <= 0) {
      return;
    }

    const ingresosParciales = [...actual.ingresosParciales, redondear(monto)];
    const actualizado: ViajeEnCurso = {
      ...actual,
      ingresosParciales,
      ingresoAcumulado: redondear(ingresosParciales.reduce((total, valor) => total + valor, 0)),
    };

    this.viajeActivo.set(actualizado);
    await this.almacenamiento.guardar(CLAVE_VIAJE_ACTIVO, actualizado);
  }

  async finalizarViaje(datos: {
    ingresoFinal: number;
    combustibleRealLitros?: number;
    costoCombustible?: number;
    notas?: string;
  }): Promise<Viaje | null> {
    const actual = this.viajeActivo();
    if (!actual) {
      return null;
    }

    await this.ubicacionService.detenerSeguimiento();

    const configuracion = this.configuracionService.configuracion();
    const fechaFin = new Date().toISOString();
    const puntoInicio = actual.puntosRuta[0];
    const puntoFin = actual.puntosRuta[actual.puntosRuta.length - 1];
    const ingreso = redondear(actual.ingresoAcumulado + (datos.ingresoFinal || 0));
    const combustibleRealLitros =
      datos.combustibleRealLitros && datos.combustibleRealLitros > 0
        ? redondear(datos.combustibleRealLitros)
        : undefined;

    const costoCombustible =
      datos.costoCombustible && datos.costoCombustible > 0
        ? redondear(datos.costoCombustible)
        : calcularCostoCombustible(combustibleRealLitros, actual.distanciaKm, configuracion);

    const viaje: Viaje = {
      id: actual.id,
      tipo: 'gps',
      fechaInicio: actual.fechaInicio,
      fechaFin,
      origen: this.coordenadaComoTexto(puntoInicio?.latitud, puntoInicio?.longitud),
      destino: this.coordenadaComoTexto(puntoFin?.latitud, puntoFin?.longitud),
      distanciaKm: actual.distanciaKm,
      duracionSegundos: Math.max(
        1,
        Math.floor((new Date(fechaFin).getTime() - new Date(actual.fechaInicio).getTime()) / 1000),
      ),
      ingreso,
      ingresosParciales: actual.ingresosParciales,
      combustibleEstimadoLitros: actual.combustibleEstimadoLitros,
      combustibleRealLitros,
      costoCombustible,
      gananciaNeta: calcularGananciaNeta(ingreso, costoCombustible),
      puntosRuta: actual.puntosRuta,
      notas: datos.notas?.trim(),
    };

    await this.guardarViaje(viaje);
    this.viajeActivo.set(null);
    await this.almacenamiento.eliminar(CLAVE_VIAJE_ACTIVO);
    return viaje;
  }

  async registrarViajeManual(datos: {
    origen: string;
    destino: string;
    distanciaKm: number;
    duracionSegundos: number;
    ingreso: number;
    combustibleRealLitros?: number;
    costoCombustible?: number;
    notas?: string;
    puntosRuta?: Viaje['puntosRuta'];
  }): Promise<void> {
    const configuracion = this.configuracionService.configuracion();
    const combustibleEstimadoLitros = calcularCombustibleEstimado(datos.distanciaKm, configuracion);
    const costoCombustible =
      datos.costoCombustible && datos.costoCombustible > 0
        ? redondear(datos.costoCombustible)
        : calcularCostoCombustible(datos.combustibleRealLitros, datos.distanciaKm, configuracion);

    const viaje: Viaje = {
      id: crypto.randomUUID(),
      tipo: 'manual',
      fechaInicio: new Date().toISOString(),
      fechaFin: new Date().toISOString(),
      origen: datos.origen.trim(),
      destino: datos.destino.trim(),
      distanciaKm: redondear(datos.distanciaKm),
      duracionSegundos: Math.max(60, Math.floor(datos.duracionSegundos)),
      ingreso: redondear(datos.ingreso),
      ingresosParciales: [],
      combustibleEstimadoLitros,
      combustibleRealLitros: datos.combustibleRealLitros ? redondear(datos.combustibleRealLitros) : undefined,
      costoCombustible,
      gananciaNeta: calcularGananciaNeta(datos.ingreso, costoCombustible),
      puntosRuta: datos.puntosRuta ?? [],
      notas: datos.notas?.trim(),
    };

    await this.guardarViaje(viaje);
  }

  async actualizarViaje(viajeActualizado: Viaje): Promise<void> {
    const viajes = this.viajes().map((viaje) => (viaje.id === viajeActualizado.id ? viajeActualizado : viaje));
    this.viajes.set(this.ordenarPorFecha(viajes));
    await this.almacenamiento.guardar(CLAVE_VIAJES, this.viajes());
  }

  async eliminarViaje(id: string): Promise<void> {
    this.viajes.set(this.viajes().filter((viaje) => viaje.id !== id));
    await this.almacenamiento.guardar(CLAVE_VIAJES, this.viajes());
  }

  filtrarPorRango(fechaInicio?: string, fechaFin?: string): Viaje[] {
    return this.viajes().filter((viaje) => {
      const fecha = new Date(viaje.fechaInicio);
      const cumpleInicio = fechaInicio ? fecha >= new Date(`${fechaInicio}T00:00:00`) : true;
      const cumpleFin = fechaFin ? fecha <= new Date(`${fechaFin}T23:59:59`) : true;
      return cumpleInicio && cumpleFin;
    });
  }

  obtenerIndicadores(viajes: Viaje[]) {
    return resumirIndicadores(viajes);
  }

  generarSerie(viajes: Viaje[], campo: 'ingreso' | 'distanciaKm', dias = 7): SerieGrafico[] {
    const ahora = new Date();
    const serie: SerieGrafico[] = [];

    for (let indice = dias - 1; indice >= 0; indice -= 1) {
      const fecha = new Date(ahora);
      fecha.setDate(ahora.getDate() - indice);
      const clave = fecha.toISOString().slice(0, 10);
      const valor = viajes
        .filter((viaje) => viaje.fechaInicio.slice(0, 10) === clave)
        .reduce((total, viaje) => total + viaje[campo], 0);

      serie.push({
        etiqueta: new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit' }).format(fecha),
        valor: redondear(valor),
      });
    }

    return serie;
  }

  exportarCsv(configuracion: ConfiguracionAplicacion): string {
    const cabeceras = [
      'Fecha',
      'Tipo',
      'Origen',
      'Destino',
      'DistanciaKm',
      'DuracionSegundos',
      'Ingreso',
      'CostoCombustible',
      'GananciaNeta',
      'Moneda',
    ];

    const filas = this.viajes().map((viaje) =>
      [
        viaje.fechaInicio,
        viaje.tipo,
        viaje.origen,
        viaje.destino,
        viaje.distanciaKm,
        viaje.duracionSegundos,
        viaje.ingreso,
        viaje.costoCombustible,
        viaje.gananciaNeta,
        configuracion.moneda,
      ]
        .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
        .join(','),
    );

    return [cabeceras.join(','), ...filas].join('\n');
  }

  private async guardarViaje(viaje: Viaje): Promise<void> {
    this.viajes.set(this.ordenarPorFecha([viaje, ...this.viajes()]));
    await this.almacenamiento.guardar(CLAVE_VIAJES, this.viajes());
  }

  private async cargarDatos(): Promise<void> {
    const [viajes, viajeActivo] = await Promise.all([
      this.almacenamiento.obtener<Viaje[]>(CLAVE_VIAJES, []),
      this.almacenamiento.obtener<ViajeEnCurso | null>(CLAVE_VIAJE_ACTIVO, null),
    ]);

    this.viajes.set(this.ordenarPorFecha(viajes));
    this.viajeActivo.set(viajeActivo);
    this.cargado.set(true);
  }

  private coordenadaComoTexto(latitud?: number, longitud?: number): string {
    if (latitud === undefined || longitud === undefined) {
      return 'Sin ubicación';
    }
    return `${latitud.toFixed(5)}, ${longitud.toFixed(5)}`;
  }

  private ordenarPorFecha(viajes: Viaje[]): Viaje[] {
    return [...viajes].sort(
      (a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime(),
    );
  }
}
