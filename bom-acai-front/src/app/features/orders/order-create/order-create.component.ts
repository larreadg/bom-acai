import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { forkJoin, finalize } from 'rxjs';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { Extra } from '../../../core/models/extra.model';
import { ProductPresentation } from '../../../core/models/product.model';
import { ExtraService } from '../../../core/services/extra.service';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { OrderService } from '../../../core/services/order.service';
import { PrintService } from '../../../core/services/print.service';
import { TopbarComponent } from '../../../shared/topbar/topbar.component';
import { OrderTicketComponent } from '../../../shared/order-ticket/order-ticket.component';
import { PresentationService } from '../../../core/services/presentation.service';
import { Order } from '../../../core/models/order.model';

interface CartItem {
  key: string;
  presentationId: number;
  productName: string;
  presentationName: string;
  quantity: number;
  unitPrice: number;
  extras: Extra[];
}

@Component({
  selector: 'app-order-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, ProgressSpinnerModule, TopbarComponent, Dialog, OrderTicketComponent],
  templateUrl: './order-create.component.html',
  styleUrl: './order-create.component.scss',
})
export class OrderCreateComponent implements OnInit {
  presentations: ProductPresentation[] = [];
  extras: Extra[] = [];
  cart: CartItem[] = [];

  loading = false;
  submitting = false;
  error = '';

  selectedPresentationId: number | null = null;
  selectedExtraIds: number[] = [];
  selectedProductFilter: string | null = null;
  searchQuery = '';

  confirmVisible = false;
  ticketVisible = false;
  printing = false;
  hasPrinter = false;
  createdOrder: Order | null = null;
  orderNotes = '';

  @ViewChild('ticketRef') ticketRef?: ElementRef<HTMLElement>;

  constructor(
    private readonly presentationService: PresentationService,
    private readonly extraService: ExtraService,
    private readonly orderService: OrderService,
    private readonly messageService: MessageService,
    private readonly cdr: ChangeDetectorRef,
    private readonly printService: PrintService,
    private readonly localSettings: LocalSettingsService,
  ) {}

  ngOnInit(): void {
    this.loadCatalog();
  }

  get productNames(): string[] {
    const names = [...new Set(this.presentations.map(p => p.productName))];
    return names.sort((a, b) => a.localeCompare(b));
  }

  get filteredPresentations(): ProductPresentation[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.presentations.filter(p => {
      if (this.selectedProductFilter && p.productName !== this.selectedProductFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q);
    });
  }

  setProductFilter(name: string | null): void {
    this.selectedProductFilter = name;
    this.selectedPresentationId = null;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.selectedPresentationId = null;
  }

  get selectedPresentation(): ProductPresentation | null {
    return this.presentations.find(item => item.id === this.selectedPresentationId) ?? null;
  }

  get selectedExtras(): Extra[] {
    return this.extras.filter(extra => this.selectedExtraIds.includes(extra.id));
  }

  get selectedUnitPrice(): number {
    return (this.selectedPresentation?.salePrice ?? 0) + this.selectedExtrasTotal;
  }

  get selectedExtrasTotal(): number {
    return this.selectedExtras.reduce((total, extra) => total + extra.price, 0);
  }

  get cartItemsCount(): number {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  get cartTotal(): number {
    return this.cart.reduce((total, item) => total + this.getCartItemTotal(item), 0);
  }

  loadCatalog(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      presentations: this.presentationService.list(),
      extras: this.extraService.list(),
    }).pipe(
      finalize(() => {
        this.syncView(() => {
          this.loading = false;
        });
      })
    ).subscribe({
      next: ({ presentations, extras }) => {
        this.syncView(() => {
          this.presentations = presentations
            .filter(item => item.active)
            .sort((a, b) => {
              const byProduct = a.productName.localeCompare(b.productName);
              return byProduct !== 0 ? byProduct : a.salePrice - b.salePrice;
            });

          this.extras = extras
            .filter(item => item.active)
            .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));

          if (this.presentations.length > 0) {
            this.selectedPresentationId = this.presentations[0].id;
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        const detail = this.getErrorMessage(err, 'No se pudo cargar el cat\u00e1logo de pedidos.');
        this.syncView(() => {
          this.error = detail;
          this.messageService.add({
            severity: 'error',
            summary: 'Pedidos',
            detail,
          });
        });
      },
    });
  }

  selectPresentation(id: number): void {
    this.selectedPresentationId = id;
  }

  toggleExtra(extraId: number): void {
    if (this.selectedExtraIds.includes(extraId)) {
      this.selectedExtraIds = this.selectedExtraIds.filter(id => id !== extraId);
      return;
    }

    this.selectedExtraIds = [...this.selectedExtraIds, extraId];
  }

  addToCart(): void {
    const presentation = this.selectedPresentation;

    if (!presentation) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Pedidos',
        detail: 'Seleccion\u00e1 una presentaci\u00f3n antes de agregar al pedido.',
      });
      return;
    }

    const extras = this.selectedExtras
      .slice()
      .sort((a, b) => a.id - b.id);

    const key = this.buildCartItemKey(presentation.id, extras.map(extra => extra.id));
    const existingItem = this.cart.find(item => item.key === key);

    if (existingItem) {
      this.cart = this.cart.map(item =>
        item.key === key ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      this.cart = [
        ...this.cart,
        {
          key,
          presentationId: presentation.id,
          productName: presentation.productName,
          presentationName: presentation.name,
          quantity: 1,
          unitPrice: presentation.salePrice,
          extras,
        },
      ];
    }

    this.selectedExtraIds = [];
  }

  increaseQuantity(item: CartItem): void {
    this.cart = this.cart.map(current =>
      current.key === item.key ? { ...current, quantity: current.quantity + 1 } : current
    );
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity === 1) {
      this.removeItem(item);
      return;
    }

    this.cart = this.cart.map(current =>
      current.key === item.key ? { ...current, quantity: current.quantity - 1 } : current
    );
  }

  removeItem(item: CartItem): void {
    this.cart = this.cart.filter(current => current.key !== item.key);
  }

  clearCart(): void {
    this.cart = [];
  }

  submitOrder(): void {
    if (this.cart.length === 0 || this.submitting) return;
    this.orderNotes = '';
    this.confirmVisible = true;
  }

  doSubmitOrder(): void {
    this.confirmVisible = false;
    this.submitting = true;

    this.orderService.create({
      notes: this.orderNotes.trim() || null,
      items: this.cart.map(item => ({
        product_presentation_id: item.presentationId,
        quantity: item.quantity,
        extras: item.extras.map(extra => extra.id),
      })),
    }).pipe(
      finalize(() => {
        this.syncView(() => { this.submitting = false; });
      })
    ).subscribe({
      next: (order) => {
        this.localSettings.get().then(s => {
          this.syncView(() => {
            this.cart = [];
            this.selectedExtraIds = [];
            this.selectedPresentationId = null;
            this.createdOrder = order;
            this.hasPrinter = !!s.printerUrl.trim();
            this.ticketVisible = true;
          });
        });
      },
      error: (err: HttpErrorResponse) => {
        this.syncView(() => {
          this.messageService.add({
            severity: 'error',
            summary: 'Pedidos',
            detail: this.getErrorMessage(err, 'No se pudo crear el pedido.'),
          });
        });
      },
    });
  }

  closeTicket(): void {
    this.ticketVisible = false;
    this.createdOrder = null;
  }

  async printTicket(): Promise<void> {
    if (!this.ticketRef || this.printing) return;
    this.printing = true;
    this.cdr.detectChanges();

    try {
      const result = await this.printService.print(this.ticketRef.nativeElement, this.createdOrder);
      this.messageService.add({
        severity: result.success ? 'success' : 'warn',
        summary: 'Impresi\u00f3n',
        detail: result.message,
      });
      if (result.success) {
        this.closeTicket();
      }
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Impresi\u00f3n',
        detail: 'No se pudo generar el ticket.',
      });
    } finally {
      this.printing = false;
      this.cdr.detectChanges();
    }
  }

  getCartItemUnitTotal(item: CartItem): number {
    const extrasTotal = item.extras.reduce((total, extra) => total + extra.price, 0);
    return item.unitPrice + extrasTotal;
  }

  getCartItemTotal(item: CartItem): number {
    return this.getCartItemUnitTotal(item) * item.quantity;
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  trackByPresentationId(_index: number, item: ProductPresentation): number {
    return item.id;
  }

  trackByExtraId(_index: number, item: Extra): number {
    return item.id;
  }

  trackByCartKey(_index: number, item: CartItem): string {
    return item.key;
  }

  private buildCartItemKey(presentationId: number, extraIds: number[]): string {
    return `${presentationId}:${extraIds.join('-')}`;
  }

  private getErrorMessage(err: HttpErrorResponse, fallback: string): string {
    if (typeof err.error === 'string' && err.error.trim()) {
      return err.error.trim();
    }

    if (err.error && typeof err.error === 'object' && typeof err.error.message === 'string') {
      return err.error.message.trim();
    }

    if (err.status === 401) {
      return 'La sesi\u00f3n ya no es v\u00e1lida. Volv\u00e9 a iniciar sesi\u00f3n.';
    }

    return fallback;
  }

  private syncView(action: () => void): void {
    action();
    this.cdr.detectChanges();
  }
}
