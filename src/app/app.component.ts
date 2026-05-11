import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  chevronBackOutline,
  cogOutline,
  downloadOutline,
  locateOutline,
  mapOutline,
  navigateOutline,
  saveOutline,
  trashOutline,
  walletOutline,
} from 'ionicons/icons';

import { ConfiguracionService } from './servicios/configuracion.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  constructor(private readonly configuracion: ConfiguracionService) {
    addIcons({
      analyticsOutline,
      chevronBackOutline,
      cogOutline,
      downloadOutline,
      locateOutline,
      mapOutline,
      navigateOutline,
      saveOutline,
      trashOutline,
      walletOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    this.configuracion.aplicarTemaInicial();

    if (Capacitor.isNativePlatform()) {
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
      await StatusBar.hide().catch(() => undefined);
      await Keyboard.setResizeMode({ mode: KeyboardResize.Ionic }).catch(() => undefined);
    }
  }
}
