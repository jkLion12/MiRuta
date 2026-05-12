import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';

import { PuntoRuta } from '../modelos/viaje.model';

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private watchId?: string;
  private intervaloRespaldo?: ReturnType<typeof setInterval>;

  async obtenerActual(): Promise<PuntoRuta> {
    if (Capacitor.isNativePlatform()) {
      await this.asegurarPermisos();
      const posicion = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 0,
      });
      return this.desdeCapacitor(posicion);
    }

    return this.desdeNavegador();
  }

  async iniciarSeguimiento(
    onPunto: (punto: PuntoRuta) => void,
    onError: (mensaje: string) => void,
  ): Promise<void> {
    await this.detenerSeguimiento();

    if (Capacitor.isNativePlatform()) {
      await this.asegurarPermisos();
      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        },
        (posicion, error) => {
          if (error) {
            onError(this.mensajeError(error.message));
            return;
          }

          if (posicion) {
            onPunto(this.desdeCapacitor(posicion));
          }
        },
      );
      this.iniciarRespaldo(onPunto, onError);
      return;
    }

    if (!navigator.geolocation) {
      onError('El GPS no esta disponible en este dispositivo.');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (posicion) => onPunto(this.desdeWeb(posicion)),
      (error) => onError(this.mensajeError(error.message)),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    );
    this.watchId = id.toString();
    this.iniciarRespaldo(onPunto, onError);
  }

  async detenerSeguimiento(): Promise<void> {
    if (this.intervaloRespaldo) {
      clearInterval(this.intervaloRespaldo);
      this.intervaloRespaldo = undefined;
    }

    if (!this.watchId) {
      return;
    }

    if (Capacitor.isNativePlatform()) {
      await Geolocation.clearWatch({ id: this.watchId }).catch(() => undefined);
    } else {
      navigator.geolocation.clearWatch(Number(this.watchId));
    }

    this.watchId = undefined;
  }

  private async asegurarPermisos(): Promise<void> {
    const permisos = await Geolocation.checkPermissions();
    if (permisos.location === 'granted') {
      return;
    }

    const solicitados = await Geolocation.requestPermissions({ permissions: ['location'] });
    if (solicitados.location !== 'granted') {
      throw new Error('Permiso de ubicacion denegado.');
    }
  }

  private desdeCapacitor(posicion: Position): PuntoRuta {
    return {
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      precision: posicion.coords.accuracy,
      timestamp: posicion.timestamp,
    };
  }

  private desdeNavegador(): Promise<PuntoRuta> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('El GPS no esta disponible en este dispositivo.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (posicion) => resolve(this.desdeWeb(posicion)),
        (error) => reject(new Error(error.message)),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    });
  }

  private desdeWeb(posicion: GeolocationPosition): PuntoRuta {
    return {
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      precision: posicion.coords.accuracy,
      timestamp: posicion.timestamp,
    };
  }

  private iniciarRespaldo(
    onPunto: (punto: PuntoRuta) => void,
    onError: (mensaje: string) => void,
  ): void {
    this.intervaloRespaldo = setInterval(() => {
      void this.obtenerActual()
        .then((punto) => onPunto(punto))
        .catch((error: unknown) => {
          const mensaje = error instanceof Error ? error.message : String(error);
          onError(this.mensajeError(mensaje));
        });
    }, 5000);
  }

  mensajeError(mensaje: string): string {
    const texto = mensaje.toLowerCase();
    if (texto.includes('timeout') || texto.includes('expired')) {
      return 'El GPS tardo demasiado en responder. Sigo intentando actualizar tu ubicacion.';
    }

    if (texto.includes('denied') || texto.includes('permission')) {
      return 'Permiso de ubicacion denegado. Activalo en los ajustes del celular.';
    }

    if (texto.includes('unavailable') || texto.includes('provider')) {
      return 'La ubicacion no esta disponible por ahora. Activa GPS y datos moviles.';
    }

    return 'No pude actualizar tu ubicacion. Sigo intentando con el GPS.';
  }
}
