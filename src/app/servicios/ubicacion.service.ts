import { Injectable, signal } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { PuntoRuta } from '../modelos/viaje.model';

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private identificadorSeguimiento: string | null = null;
  private observadores = new Set<(puntos: PuntoRuta[]) => void>();

  readonly puntosRuta = signal<PuntoRuta[]>([]);
  readonly error = signal<string | null>(null);
  readonly activo = signal(false);

  registrarObservador(callback: (puntos: PuntoRuta[]) => void): () => void {
    this.observadores.add(callback);
    return () => this.observadores.delete(callback);
  }

  async iniciarSeguimiento(): Promise<void> {
    if (this.identificadorSeguimiento) {
      return;
    }

    this.error.set(null);
    this.puntosRuta.set([]);

    try {
      const posicionInicial = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      this.agregarPunto(posicionInicial);
      this.identificadorSeguimiento = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
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
    } catch (error) {
      this.error.set('No fue posible acceder al GPS del dispositivo.');
      this.activo.set(false);
    }
  }

  async detenerSeguimiento(): Promise<void> {
    if (this.identificadorSeguimiento) {
      await Geolocation.clearWatch({ id: this.identificadorSeguimiento });
      this.identificadorSeguimiento = null;
    }
    this.activo.set(false);
  }

  private agregarPunto(posicion: Position): void {
    const nuevoPunto: PuntoRuta = {
      latitud: posicion.coords.latitude,
      longitud: posicion.coords.longitude,
      marcaTiempo: new Date(posicion.timestamp).toISOString(),
      velocidadKmh:
        posicion.coords.speed !== null && posicion.coords.speed !== undefined
          ? Number((posicion.coords.speed * 3.6).toFixed(1))
          : undefined,
    };

    const puntos = [...this.puntosRuta(), nuevoPunto];
    this.puntosRuta.set(puntos);
    for (const observador of this.observadores) {
      observador(puntos);
    }
  }
}
