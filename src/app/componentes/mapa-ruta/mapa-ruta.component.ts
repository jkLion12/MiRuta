import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { PuntoRuta } from '../../modelos/viaje.model';

export type CapaMapa = 'calles' | 'satelite';

@Component({
  selector: 'app-mapa-ruta',
  standalone: true,
  templateUrl: './mapa-ruta.component.html',
  styleUrl: './mapa-ruta.component.scss',
})
export class MapaRutaComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() puntos: PuntoRuta[] = [];
  @Input() centro?: PuntoRuta | null;
  @Input() capa: CapaMapa = 'calles';
  @Input() seguirCentro = false;

  @ViewChild('mapa', { static: true }) private readonly mapaRef?: ElementRef<HTMLDivElement>;

  private mapa?: L.Map;
  private capaActual?: L.TileLayer;
  private ruta?: L.Polyline;
  private marcadorActual?: L.CircleMarker;
  private circuloPrecision?: L.Circle;

  ngAfterViewInit(): void {
    this.crearMapa();
    this.pintar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapa) {
      return;
    }

    if (changes['capa']) {
      this.cambiarCapa();
    }

    this.pintar();
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
    this.mapa = undefined;
  }

  invalidarTamano(): void {
    window.setTimeout(() => this.mapa?.invalidateSize(true), 120);
  }

  private crearMapa(): void {
    if (!this.mapaRef || this.mapa) {
      return;
    }

    const centroInicial =
      this.centro ?? this.puntos[this.puntos.length - 1] ?? {
        lat: -12.0464,
        lng: -77.0428,
        timestamp: Date.now(),
      };
    this.mapa = L.map(this.mapaRef.nativeElement, {
      center: [centroInicial.lat, centroInicial.lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });
    this.cambiarCapa();
    this.invalidarTamano();
  }

  private cambiarCapa(): void {
    if (!this.mapa) {
      return;
    }

    if (this.capaActual) {
      this.capaActual.removeFrom(this.mapa);
    }

    const url =
      this.capa === 'satelite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    this.capaActual = L.tileLayer(url, {
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(this.mapa);
  }

  private pintar(): void {
    if (!this.mapa) {
      return;
    }

    const puntoActual = this.puntos[this.puntos.length - 1] ?? this.centro;

    this.ruta?.removeFrom(this.mapa);
    if (this.puntos.length > 1) {
      this.ruta = L.polyline(
        this.puntos.map((punto) => [punto.lat, punto.lng]),
        { color: '#f1485b', weight: 5, opacity: 0.9 },
      ).addTo(this.mapa);
    }

    this.marcadorActual?.removeFrom(this.mapa);
    this.circuloPrecision?.removeFrom(this.mapa);

    if (puntoActual) {
      this.marcadorActual = L.circleMarker([puntoActual.lat, puntoActual.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#f1485b',
        fillOpacity: 1,
      }).addTo(this.mapa);

      if (puntoActual.precision) {
        this.circuloPrecision = L.circle([puntoActual.lat, puntoActual.lng], {
          radius: puntoActual.precision,
          color: '#7fa7b8',
          fillColor: '#7fa7b8',
          fillOpacity: 0.16,
          weight: 1,
        }).addTo(this.mapa);
      }

      if (this.seguirCentro || this.puntos.length <= 1) {
        this.mapa.setView([puntoActual.lat, puntoActual.lng], Math.max(this.mapa.getZoom(), 16), {
          animate: true,
        });
      }
    }

    this.invalidarTamano();
  }
}
