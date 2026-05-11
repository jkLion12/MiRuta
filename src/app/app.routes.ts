import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs/panel',
    pathMatch: 'full',
  },
  {
    path: 'tabs',
    loadComponent: () =>
      import('./paginas/principal/principal.page').then((m) => m.PrincipalPage),
    children: [
      {
        path: 'panel',
        loadComponent: () => import('./paginas/panel/panel.page').then((m) => m.PanelPage),
      },
      {
        path: 'viajes',
        loadComponent: () => import('./paginas/viajes/viajes.page').then((m) => m.ViajesPage),
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./paginas/historial/historial.page').then((m) => m.HistorialPage),
      },
      {
        path: 'historial/:id',
        loadComponent: () =>
          import('./paginas/detalle-viaje/detalle-viaje.page').then((m) => m.DetalleViajePage),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./paginas/configuracion/configuracion.page').then((m) => m.ConfiguracionPage),
      },
      {
        path: '',
        redirectTo: 'panel',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'tabs/panel',
  },
];
