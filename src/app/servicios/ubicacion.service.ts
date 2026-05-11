import { Injectable, signal } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { PuntoRuta } from '../modelos/viaje.model';

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private readonly precisionObjetivoMetros = 12;
  private readonly precisionMaximaAceptableMetros = 30;
  private readonly precisionInicialMaximaMetros = 500;
  private readonly saltoMaximoKm = 0.15;
  private identificadorSeguimiento: string | null = null;
  private observadores = new Set<(puntos: PuntoRuta[]) => void>();

  readonly puntosRuta = signal<PuntoRuta[]>([]);
  readonly ubicacionActual = signal<PuntoRuta | null>(null);
  readonly error = signal<string | null>(null);
  readonly activo = signal(false);

  registrarObservador(callback: (puntos: PuntoRuta[]) => void): () => void {
    this.observadores.add(callback);
    return () => this.observadores.delete(callback);
  }

  async iniciarSeguimiento(): Promise<PuntoRuta | null> {
    if (this.identificadorSeguimiento) {
      return this.puntosRuta()[0] ?? this.ubicacionActual();
    }

    this.error.set(null);
    this.puntosRuta.set([]);

    try {
      await this.asegurarPermisos();
      const posicionInicial = await this.obtenerPosicionInicialDisponible();
      const puntoInicial = this.agregarPunto(posicionInicial, true);

      this.identificadorSeguimiento = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
          minimumUpdateInterval: 3000,
        },
        (posicion, error) => {
          if (error) {
            this.error.set(error.message);
            return;
          }

          if (posicion) {
            this.agregarPunto(posicion);
          }
        },
      );

      this.activo.set(true);
      return puntoInicial;
    } catch (error) {
      this.error.set(this.interpretarErrorUbicacion(error, 'No fue posible acceder al GPS del dispositivo.'));
      this.activo.set(false);
      return null;
    }
  }

  async detenerSeguimiento(): Promise<void> {
    if (this.identificadorSeguimiento) {
      await Geolocation.clearWatch({ id: this.identificadorSeguimiento });
      this.identificadorSeguimiento = null;
    }

    this.activo.set(false);
  }

  async actualizarUbicacionActual(): Promise<PuntoRuta | null> {
    try {
      await this.asegurarPermisos();
      const posicion = await this.obtenerPosicionInicialDisponible();
      const punto = this.mapearPosicionAPunto(posicion);
      this.ubicacionActual.set(punto);
      if (!this.activo()) {
        this.error.set(null);
      }
      return punto;
    } catch (error) {
      this.error.set(this.interpretarErrorUbicacion(error, 'No fue posible obtener tu ubicacion actual.'));
      return null;
    }
  }

  private agregarPunto(posicion: Position, forzarPrimerPunto = false): PuntoRuta | null {
    const precisionMetros = posicion.coords.accuracy ?? 999;
    const esPrimerPunto = this.puntosRuta().length === 0;
    const precisionLimite = esPrimerPunto
      ? this.precisionInicialMaximaMetros
      : this.precisionMaximaAceptableMetros;

    if (precisionMetros > precisionLimite) {
      if (esPrimerPunto && forzarPrimerPunto) {
        this.error.set(
          `GPS inicial impreciso (${Math.round(precisionMetros)} m), mostrando posicion aproximada.`,
        );
      } else {
        this.error.set(`Precision GPS baja (${Math.round(precisionMetros)} m). Esperando mejor senal...`);
        return null;
      }
    } else {
      this.error.set(null);
    }

    const nuevoPunto = this.mapearPosicionAPunto(posicion);
    const ultimoPunto = this.puntosRuta()[this.puntosRuta().length - 1];

    if (ultimoPunto && this.debeIgnorarSalto(ultimoPunto, nuevoPunto)) {
      this.error.set('Lectura GPS inestable detectada. Esperando una posicion mas confiable...');
      return null;
    }

    this.ubicacionActual.set(nuevoPunto);

    if (esPrimerPunto || this.activo()) {
      const puntos = [...this.puntosRuta(), nuevoPunto];
      this.puntosRuta.set(puntos);
      for (const observador of this.observadores) {
        observador(puntos);
      }
    }

    return nuevoPunto;
  }

  private async obtenerPosicionInicialDisponible(): Promise<Position> {
    let mejorPosicion: Position | null = null;
    const estrategias = [
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 600000 },
    ] as const;

    for (const estrategia of estrategias) {
      try {
        const posicion = await Geolocation.getCurrentPosition(estrategia);

        if (!mejorPosicion || (posicion.coords.accuracy ?? 9999) < (mejorPosicion.coords.accuracy ?? 9999)) {
          mejorPosicion = posicion;
        }

        if ((posicion.coords.accuracy ?? 9999) <= this.precisionObjetivoMetros) {
          return posicion;
        }
      } catch {
        // Seguimos intentando con otra estrategia.
      }
    }

    if (mejorPosicion) {
      return mejorPosicion;
    }

    const posicionNavegador = await this.obtenerPosicionDesdeNavegador();
    if (posicionNavegador) {
      return posicionNavegador;
    }

    throw new Error('No fue posible obtener una posicion inicial disponible.');
  }

  private async asegurarPermisos(): Promise<void> {
    const permisosActuales = await Geolocation.checkPermissions();
    const estadoActual = permisosActuales.location ?? permisosActuales.coarseLocation;

    if (estadoActual === 'granted') {
      return;
    }

    const permisosSolicitados = await Geolocation.requestPermissions();
    const estadoFinal = permisosSolicitados.location ?? permisosSolicitados.coarseLocation;

    if (estadoFinal !== 'granted') {
      throw new Error('Permiso de ubicacion denegado.');
    }
  }

  private async obtenerPosicionDesdeNavegador(): Promise<Position | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }

    return new Promise<Position | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          resolve({
            coords: {
              latitude: posicion.coords.latitude,
              longitude: posicion.coords.longitude,
              accuracy: posicion.coords.accuracy,
              altitude: posicion.coords.altitude,
              altitudeAccuracy: posicion.coords.altitudeAccuracy,
              heading: posicion.coords.heading,
              speed: posicion.coords.speed,
            },
            timestamp: posicion.timestamp,
          } as Position);
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 300000,
        },
      );
    });
  }

  private interpretarErrorUbicacion(error: unknown, mensajePorDefecto: string): string {
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
      const mensaje = error.message.toLowerCase();

      if (mensaje.includes('denied') || mensaje.includes('permiso')) {
        return 'La app no tiene permiso de ubicacion. Habilitalo en los permisos del dispositivo.';
      }

      if (mensaje.includes('timeout')) {
        return 'El GPS tardó demasiado en responder. Activa la ubicacion del celular e intenta otra vez.';
      }

      if (mensaje.includes('disabled') || mensaje.includes('services')) {
        return 'La ubicacion del dispositivo parece estar desactivada. Enciende el GPS e intenta nuevamente.';
      }
    }

    return mensajePorDefecto;
  }

  private debeIgnorarSalto(origen: PuntoRuta, destino: PuntoRuta): boolean {
    const distanciaKm = this.calcularDistanciaKm(origen, destino);
    const segundos = Math.max(
      1,
      Math.floor(
        (new Date(destino.marcaTiempo).getTime() - new Date(origen.marcaTiempo).getTime()) / 1000,
      ),
    );

    return distanciaKm > this.saltoMaximoKm && segundos < 10;
  }

  private calcularDistanciaKm(origen: PuntoRuta, destino: PuntoRuta): number {
    const radioTierraKm = 6371;
    const dLat = this.gradosARadianes(destino.latitud - origen.latitud);
    const dLng = this.gradosARadianes(destino.longitud - origen.longitud);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.gradosARadianes(origen.latitud)) *
        Math.cos(this.gradosARadianes(destino.latitud)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radioTierraKm * c;
  }

  private gradosARadianes(valor: number): number {
    return (valor * Math.PI) / 180;
  }

  private mapearPosicionAPunto(posicion: Position): PuntoRuta {
    return {
      latitud: posicion.coords.latitude,
      longitud: posicion.coords.longitude,
      marcaTiempo: new Date(posicion.timestamp).toISOString(),
      precisionMetros: posicion.coords.accuracy ?? undefined,
      velocidadKmh:
        posicion.coords.speed !== null && posicion.coords.speed !== undefined
          ? Number((posicion.coords.speed * 3.6).toFixed(1))
          : undefined,
    };
  }
}
