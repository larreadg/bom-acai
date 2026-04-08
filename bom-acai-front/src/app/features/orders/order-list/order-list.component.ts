import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';

import { Order, OrderSummary } from '../../../core/models/order.model';
import { OrderFilters, OrderService } from '../../../core/services/order.service';
import { ReportService } from '../../../core/services/report.service';
import { TopbarComponent } from '../../../shared/topbar/topbar.component';

type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DatePicker, SelectButton, TableModule, Dialog, TopbarComponent],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss',
})
export class OrderListComponent implements OnInit {
  orders: Order[] = [];
  summary: OrderSummary = { totalOrders: 0, totalAmount: 0, totalCost: 0, totalProfit: 0, cancelledOrders: 0 };
  loading = false;

  dateRange: DateRange = 'today';
  customRange: Date[] | null = null;
  expandedIds = new Set<number>();

  cancelTarget: Order | null = null;
  cancelling = false;
  exporting = false;

  get cancelVisible(): boolean { return this.cancelTarget !== null; }
  set cancelVisible(v: boolean) { if (!v) this.cancelTarget = null; }

  readonly dateRangeOptions = [
    { label: 'Hoy',           value: 'today'     },
    { label: 'Ayer',          value: 'yesterday' },
    { label: 'Esta semana',   value: 'week'      },
    { label: 'Este mes',      value: 'month'     },
    { label: 'Personalizado', value: 'custom'    },
  ];

  constructor(
    private readonly orderService: OrderService,
    private readonly reportService: ReportService,
    private readonly messageService: MessageService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  toggleRow(id: number): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedIds.has(id);
  }

  load(): void {
    this.loading = true;
    this.expandedIds = new Set();
    this.cdr.detectChanges();

    this.orderService.list(this.buildFilters()).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: result => {
        this.orders  = result.orders;
        this.summary = result.summary;
      },
      error: (err: HttpErrorResponse) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Historial',
          detail: this.errMsg(err, 'No se pudo cargar el historial.'),
        });
      },
    });
  }

  onDateRangeChange(): void {
    if (this.dateRange !== 'custom') {
      this.customRange = null;
      this.load();
    }
  }

  onCustomRangeChange(): void {
    if (this.customRange?.[0] && this.customRange?.[1]) {
      this.load();
    }
  }

  confirmCancel(order: Order): void {
    this.cancelTarget = order;
  }

  doCancel(): void {
    if (!this.cancelTarget) return;
    const id = this.cancelTarget.id;
    this.cancelling = true;

    this.orderService.cancel(id).pipe(
      finalize(() => this.syncView(() => { this.cancelling = false; }))
    ).subscribe({
      next: updated => {
        this.syncView(() => {
          this.orders = this.orders.map(o => o.id === id ? updated : o);
          this.summary.cancelledOrders++;
          this.cancelTarget = null;
        });
        this.messageService.add({ severity: 'success', summary: 'Pedido cancelado', detail: `Pedido #${this.formatOrderId(id)} cancelado.` });
      },
      error: (err: HttpErrorResponse) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.errMsg(err, 'No se pudo cancelar el pedido.'),
        });
        this.cancelTarget = null;
      },
    });
  }

  formatOrderId(id: number): string {
    return String(id).padStart(7, '0');
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDateTime(dateStr: string | null): { date: string; time: string } {
    if (!dateStr) return { date: '-', time: '-' };
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  }

  async exportExcel(): Promise<void> {
    if (this.exporting) return;
    this.exporting = true;
    this.cdr.detectChanges();
    try {
      await this.reportService.downloadOrdersReport(this.orders, this.summary, this.periodLabel());
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Exportar', detail: 'No se pudo generar el reporte.' });
    } finally {
      this.exporting = false;
      this.cdr.detectChanges();
    }
  }

  private periodLabel(): string {
    const labels: Record<string, string> = {
      today:     'Hoy',
      yesterday: 'Ayer',
      week:      'Esta semana',
      month:     'Este mes',
    };
    if (this.dateRange !== 'custom') return labels[this.dateRange] ?? '';
    const from = this.customRange?.[0];
    const to   = this.customRange?.[1];
    if (from && to) return `${this.fmtDate(from)} al ${this.fmtDate(to)}`;
    return 'Personalizado';
  }

  private buildFilters(): OrderFilters {
    if (this.dateRange === 'custom') {
      const from = this.customRange?.[0] ?? null;
      const to   = this.customRange?.[1] ?? null;
      if (from && to) {
        return { dateFrom: this.fmtDate(from), dateTo: this.fmtDate(to) };
      }
      const today = this.fmtDate(new Date());
      return { dateFrom: today, dateTo: today };
    }

    const { dateFrom, dateTo } = this.dateRangeForPeriod(this.dateRange);
    return { dateFrom, dateTo };
  }

  private dateRangeForPeriod(range: DateRange): { dateFrom: string; dateTo: string } {
    const today    = new Date();
    const todayStr = this.fmtDate(today);

    if (range === 'today') return { dateFrom: todayStr, dateTo: todayStr };

    if (range === 'yesterday') {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      const s = this.fmtDate(y);
      return { dateFrom: s, dateTo: s };
    }

    if (range === 'month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: this.fmtDate(first), dateTo: todayStr };
    }

    // week: lunes a hoy
    const day      = today.getDay();
    const daysBack = day === 0 ? 6 : day - 1;
    const monday   = new Date(today);
    monday.setDate(today.getDate() - daysBack);
    return { dateFrom: this.fmtDate(monday), dateTo: todayStr };
  }

  private fmtDate(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  private errMsg(err: HttpErrorResponse, fallback: string): string {
    if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();
    if (err.error?.message) return err.error.message;
    return fallback;
  }

  private syncView(action: () => void): void {
    action();
    this.cdr.detectChanges();
  }
}
