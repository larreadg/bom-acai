import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [ButtonModule, RouterLink],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  /** Texto debajo del título principal */
  @Input() subtitle = '';

  /**
   * Ruta del botón de navegación (izquierda de las acciones).
   * null → no se muestra ningún botón de navegación (ej. pantalla Home).
   */
  @Input() backRoute: string | null = null;

  /** Etiqueta del botón de navegación */
  @Input() backLabel = 'Inicio';

  /** Ícono del botón de navegación */
  @Input() backIcon = 'pi pi-home';

  constructor(public readonly auth: AuthService) {}
}
