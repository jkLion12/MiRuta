import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { PuntoRuta } from '../../modelos/viaje.model';

@Component({
  selector: 'app-mapa-ruta',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mapa" #contenedorMapa></div>`,
  styleUrls: ['./mapa-ruta.component.scss'],
})
export class MapaRutaComponent implements AfterViewInit, OnChanges {
  @Input() puntosRuta: PuntoRuta[] = [];
  @ViewChild('contenedorMapa') private contenedorMapa?: ElementRef<HTMLDivElement>;

  private mapa?: L.Map;
  private capaRuta?: L.Polyline;
  private capaPuntos?: L.FeatureGroup;

  ngAfterViewInit(): void {
    this.inicializarMapa();
    this.actualizarMapa();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['puntosRuta'] && this.mapa) {
      this.actualizarMapa();
    }
  }

  private inicializarMapa(): void {
    if (!this.contenedorMapa || this.mapa) {
      return;
    }

    this.mapa = L.map(this.contenedorMapa.nativeElement, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-12.0464, -77.0428], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.mapa);

    L.control.zoom({ position: 'bottomright' }).addTo(this.mapa);
    this.capaPuntos = L.featureGroup().addTo(this.mapa);
  }

  private actualizarMapa(): void {
    if (!this.mapa || !this.capaPuntos) {
      return;
    }

    this.capaRuta?.remove();
    this.capaPuntos.clearLayers();

    if (!this.puntosRuta.length) {
      this.mapa.setView([-12.0464, -77.0428], 12);
      return;
    }

    const latLngs = this.puntosRuta.map((punto) => L.latLng(punto.latitud, punto.longitud));
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
  }
}
