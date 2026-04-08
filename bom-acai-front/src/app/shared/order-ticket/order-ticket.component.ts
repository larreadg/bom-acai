import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Order } from '../../core/models/order.model';

@Component({
  selector: 'app-order-ticket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-ticket.component.html',
  styleUrl: './order-ticket.component.scss',
})
export class OrderTicketComponent {
  @Input({ required: true }) order!: Order;

  formatPrice(value: number): string {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatOrderId(id: number): string {
    return String(id).padStart(7, '0');
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatTime(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}
