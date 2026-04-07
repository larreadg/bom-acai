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
      title: 'Productos',
      icon: 'pi pi-box',
      available: false,
      note: 'Pr\u00f3ximamente',
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
      available: false,
      note: 'Pr\u00f3ximamente',
    },
  ];

  constructor(public auth: AuthService) {}
}
