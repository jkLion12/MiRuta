import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonIcon, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gridOutline,
  navigateOutline,
  settingsOutline,
  timeOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [IonApp, IonIcon, IonRouterOutlet, RouterLink, RouterLinkActive],
})
export class AppComponent {
  constructor() {
    addIcons({
      'grid-outline': gridOutline,
      'navigate-outline': navigateOutline,
      'time-outline': timeOutline,
      'settings-outline': settingsOutline,
    });
  }
}
