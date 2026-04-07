import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';

import { AuthService } from '../../core/services/auth.service';

interface HomeModuleCard {
  title: string;
  icon: string;
  route?: string;
  available: boolean;
  note: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ButtonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  readonly modules: HomeModuleCard[] = [
    {
      title: 'Pedidos',
      icon: 'pi pi-shopping-cart',
      available: false,
      note: 'Pr\u00f3ximamente',
    },
    {
      title: 'Presentaciones',
      icon: 'pi pi-objects-column',
      route: '/presentaciones',
      available: true,
      note: 'Tama\u00f1os \u00b7 Precios \u00b7 Im\u00e1genes',
    },
    {
      title: 'Productos',
      icon: 'pi pi-box',
      route: '/productos',
      available: true,
      note: 'Disponible',
    },
    {
      title: 'Categor\u00edas',
      icon: 'pi pi-tags',
      route: '/categorias',
      available: true,
      note: 'Disponible',
    },
    {
      title: 'Extras',
      icon: 'pi pi-plus-circle',
      route: '/extras',
      available: true,
      note: 'Toppings \u00b7 Agregados \u00b7 Precios',
    },
  ];

  constructor(public auth: AuthService) {}
}
