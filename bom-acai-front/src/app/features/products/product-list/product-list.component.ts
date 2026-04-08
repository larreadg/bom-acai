import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Product } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';
import { TopbarComponent } from '../../../shared/topbar/topbar.component';

type ProductStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TopbarComponent,
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  searchTerm = '';
  statusFilter: ProductStatusFilter = 'all';
  loading = false;
  error = '';
  pendingProductId: number | null = null;

  readonly statusFilters: Array<{ label: string; value: ProductStatusFilter }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'active' },
    { label: 'Inactivos', value: 'inactive' },
  ];

  constructor(
    private productService: ProductService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  get filteredProducts(): Product[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.products.filter((product) => {
      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && product.active) ||
        (this.statusFilter === 'inactive' && !product.active);

      if (!matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        product.name,
        product.categoryName,
        product.description ?? '',
      ].join(' ').toLowerCase();

      return haystack.includes(search);
    });
  }

  get totalCount(): number {
    return this.products.length;
  }

  get activeCount(): number {
    return this.products.filter((product) => product.active).length;
  }

  get inactiveCount(): number {
    return this.products.filter((product) => !product.active).length;
  }

  setStatusFilter(filter: ProductStatusFilter): void {
    this.statusFilter = filter;
  }

  loadProducts(): void {
    this.loading = true;
    this.error = '';

    this.productService.list().pipe(
      finalize(() => {
        this.syncView(() => {
          this.loading = false;
        });
      })
    ).subscribe({
      next: (products) => {
        this.syncView(() => {
          this.products = products;
        });
      },
      error: (err: HttpErrorResponse) => {
        const message = this.getErrorMessage(err, 'No se pudieron cargar los productos.');

        this.syncView(() => {
          this.error = message;
          this.messageService.add({
            severity: 'error',
            summary: 'Productos',
            detail: message,
          });
        });
      }
    });
  }

  toggleProductStatus(product: Product, nextActiveState: boolean): void {
    const actionLabel = nextActiveState ? 'activar' : 'desactivar';

    if (!nextActiveState) {
      const confirmed = window.confirm(
        `Se va a desactivar el producto "${product.name}". Podr\u00e1s volver a activarlo despu\u00e9s.`
      );

      if (!confirmed) {
        return;
      }
    }

    this.pendingProductId = product.id;

    if (nextActiveState) {
      this.productService.update(product.id, { active: true }).pipe(
        finalize(() => {
          this.syncView(() => {
            this.pendingProductId = null;
          });
        })
      ).subscribe({
        next: (updatedProduct) => {
          this.syncView(() => {
            this.products = this.products.map((item) =>
              item.id === updatedProduct.id ? updatedProduct : item
            );

            this.messageService.add({
              severity: 'success',
              summary: 'Productos',
              detail: `El producto se pudo ${actionLabel}.`,
            });
          });
        },
        error: (err: HttpErrorResponse) => {
          this.syncView(() => {
            this.messageService.add({
              severity: 'error',
              summary: 'Productos',
              detail: this.getErrorMessage(err, `No se pudo ${actionLabel} el producto.`),
            });
          });
        }
      });

      return;
    }

    this.productService.delete(product.id).pipe(
      finalize(() => {
        this.syncView(() => {
          this.pendingProductId = null;
        });
      })
    ).subscribe({
      next: () => {
        this.syncView(() => {
          this.products = this.products.map((item) =>
            item.id === product.id ? { ...item, active: false } : item
          );

          this.messageService.add({
            severity: 'success',
            summary: 'Productos',
            detail: `El producto se pudo ${actionLabel}.`,
          });
        });
      },
      error: (err: HttpErrorResponse) => {
        this.syncView(() => {
          this.messageService.add({
            severity: 'error',
            summary: 'Productos',
            detail: this.getErrorMessage(err, `No se pudo ${actionLabel} el producto.`),
          });
        });
      }
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  trackByProductId(_index: number, product: Product): number {
    return product.id;
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
