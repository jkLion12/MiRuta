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

const PROVEEDORES_MAPA: Record<CapaMapa, string[]> = {
  calles: [
    'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    'http://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  ],
  satelite: [
    'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    'http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
  ],
};

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
  private observadorTamano?: ResizeObserver;
  private erroresCapa = 0;
  private cambiandoProveedor = false;
  private indiceProveedor: Record<CapaMapa, number> = {
    calles: 0,
    satelite: 0,
  };

  ngAfterViewInit(): void {
    this.crearMapa();
    this.pintar();
    this.observarTamano();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapa) {
      return;
    }

    if (changes['capa']) {
      this.indiceProveedor[this.capa] = 0;
      this.cambiarCapa();
    }

    this.pintar();
  }

  ngOnDestroy(): void {
    this.observadorTamano?.disconnect();
    this.mapa?.remove();
    this.mapa = undefined;
  }

  invalidarTamano(): void {
    [0, 180, 600, 1200].forEach((espera) => {
      window.setTimeout(() => this.mapa?.invalidateSize(true), espera);
    });
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
      preferCanvas: true,
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

    this.erroresCapa = 0;
    this.cambiandoProveedor = false;
    const url = this.urlCapa();

    this.capaActual = L.tileLayer(url, {
      maxZoom: 19,
      minZoom: 3,
      keepBuffer: 4,
      updateWhenIdle: false,
    })
      .on('tileerror', () => this.manejarErrorCapa())
      .addTo(this.mapa);
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

  private observarTamano(): void {
    if (!this.mapaRef) {
      return;
    }

    this.observadorTamano = new ResizeObserver(() => this.invalidarTamano());
    this.observadorTamano.observe(this.mapaRef.nativeElement);
  }

  private urlCapa(): string {
    return PROVEEDORES_MAPA[this.capa][this.indiceProveedor[this.capa]];
  }

  private manejarErrorCapa(): void {
    if (!this.mapa || this.cambiandoProveedor) {
      return;
    }

    this.erroresCapa += 1;
    const proveedores = PROVEEDORES_MAPA[this.capa];
    const hayRespaldo = this.indiceProveedor[this.capa] < proveedores.length - 1;

    if (this.erroresCapa >= 2 && hayRespaldo) {
      this.cambiandoProveedor = true;
      this.indiceProveedor[this.capa] += 1;
      window.setTimeout(() => this.cambiarCapa(), 250);
    }
  }
}
