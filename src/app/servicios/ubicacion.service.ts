import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';

import { PuntoRuta } from '../modelos/viaje.model';

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private watchId?: string;

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
          timeout: 20000,
          maximumAge: 0,
        },
        (posicion, error) => {
          if (error) {
            onError(error.message);
            return;
          }

          if (posicion) {
            onPunto(this.desdeCapacitor(posicion));
          }
        },
      );
      return;
    }

    if (!navigator.geolocation) {
      onError('El GPS no esta disponible en este dispositivo.');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (posicion) => onPunto(this.desdeWeb(posicion)),
      (error) => onError(error.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    this.watchId = id.toString();
  }

  async detenerSeguimiento(): Promise<void> {
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
}
