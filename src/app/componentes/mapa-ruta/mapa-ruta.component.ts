import { CommonModule } from '@angular/common';
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

@Component({
  selector: 'app-mapa-ruta',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="contenedor-mapa">
      <div class="controles-mapa">
        <button type="button" [class.activo]="modoMapa === 'calles'" (click)="cambiarModoMapa('calles')">
          Calles
        </button>
        <button type="button" [class.activo]="modoMapa === 'satelite'" (click)="cambiarModoMapa('satelite')">
          Satélite
        </button>
      </div>
      <div class="mapa" #contenedorMapa></div>
    </div>
  `,
  styleUrls: ['./mapa-ruta.component.scss'],
})
export class MapaRutaComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() puntosRuta: PuntoRuta[] = [];
  @Input() centroInicial?: PuntoRuta | null;
  @ViewChild('contenedorMapa') private contenedorMapa?: ElementRef<HTMLDivElement>;

  private mapa?: L.Map;
  private capaRuta?: L.Polyline;
  private capaPuntos?: L.FeatureGroup;
  private capaBaseActual?: L.TileLayer;
  private observadorTamano?: ResizeObserver;
  modoMapa: 'calles' | 'satelite' = 'calles';

  ngAfterViewInit(): void {
    this.inicializarMapa();
    this.actualizarMapa();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['puntosRuta'] || changes['centroInicial']) && this.mapa) {
      this.actualizarMapa();
    }
  }

  ngOnDestroy(): void {
    this.observadorTamano?.disconnect();
    this.mapa?.remove();
  }

  cambiarModoMapa(modo: 'calles' | 'satelite'): void {
    this.modoMapa = modo;
    this.aplicarCapaBase();
  }

  private inicializarMapa(): void {
    if (!this.contenedorMapa || this.mapa) {
      return;
    }

    this.mapa = L.map(this.contenedorMapa.nativeElement, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-12.0464, -77.0428], 13);

    this.aplicarCapaBase();
    L.control.zoom({ position: 'bottomright' }).addTo(this.mapa);
    this.capaPuntos = L.featureGroup().addTo(this.mapa);
    this.observadorTamano = new ResizeObserver(() => this.invalidarTamanoMapa());
    this.observadorTamano.observe(this.contenedorMapa.nativeElement);
    this.invalidarTamanoMapa();
  }

  private actualizarMapa(): void {
    if (!this.mapa || !this.capaPuntos) {
      return;
    }

    this.capaRuta?.remove();
    this.capaPuntos.clearLayers();

    if (!this.puntosRuta.length) {
      if (this.centroInicial) {
        this.mapa.setView([this.centroInicial.latitud, this.centroInicial.longitud], 16);
        L.circleMarker([this.centroInicial.latitud, this.centroInicial.longitud], {
          radius: 9,
          color: '#f7efed',
          weight: 2,
          fillColor: '#f1485b',
          fillOpacity: 1,
        }).addTo(this.capaPuntos);
      } else {
        this.mapa.setView([-12.0464, -77.0428], 12);
      }
      this.invalidarTamanoMapa();
      return;
    }

    const latLngs = this.puntosRuta.map((punto) => L.latLng(punto.latitud, punto.longitud));
    if (latLngs.length === 1) {
      const unicoPunto = latLngs[0];
      L.circleMarker(unicoPunto, {
        radius: 9,
        color: '#f7efed',
        weight: 2,
        fillColor: '#f1485b',
        fillOpacity: 1,
      }).addTo(this.capaPuntos);
      this.mapa.setView(unicoPunto, 17);
      this.invalidarTamanoMapa();
      return;
    }

    this.capaRuta = L.polyline(latLngs, {
      color: '#f1485b',
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
    }).addTo(this.mapa);

    const puntoInicio = latLngs[0];
    const puntoFin = latLngs[latLngs.length - 1];

    L.circleMarker(puntoInicio, {
      radius: 7,
      color: '#f7efed',
      weight: 2,
      fillColor: '#7fa7b8',
      fillOpacity: 1,
    }).addTo(this.capaPuntos);

    L.circleMarker(puntoFin, {
      radius: 8,
      color: '#f7efed',
      weight: 2,
      fillColor: '#33546d',
      fillOpacity: 1,
    }).addTo(this.capaPuntos);

    this.mapa.fitBounds(this.capaRuta.getBounds(), {
      padding: [24, 24],
      maxZoom: 16,
    });
    this.invalidarTamanoMapa();
  }

  private aplicarCapaBase(): void {
    if (!this.mapa) {
      return;
    }

    this.capaBaseActual?.remove();
    this.capaBaseActual =
      this.modoMapa === 'satelite'
        ? L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
              maxZoom: 19,
            },
          )
        : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          });

    this.capaBaseActual.addTo(this.mapa);
    this.capaBaseActual.on('load', () => this.invalidarTamanoMapa());
  }

  private invalidarTamanoMapa(): void {
    if (!this.mapa) {
      return;
    }

    requestAnimationFrame(() => {
      this.mapa?.invalidateSize();
    });
    setTimeout(() => this.mapa?.invalidateSize(), 150);
  }
}
