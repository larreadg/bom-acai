import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
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

import { Category } from '../../../core/models/category.model';
import { AuthService } from '../../../core/services/auth.service';
import { CategoryService } from '../../../core/services/category.service';

type CategoryStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-category-list',
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
  ],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss'
})
export class CategoryListComponent implements OnInit {
  categories: Category[] = [];
  searchTerm = '';
  statusFilter: CategoryStatusFilter = 'all';
  loading = false;
  error = '';
  pendingCategoryId: number | null = null;

  readonly statusFilters: Array<{ label: string; value: CategoryStatusFilter }> = [
    { label: 'Todas', value: 'all' },
    { label: 'Activas', value: 'active' },
    { label: 'Inactivas', value: 'inactive' },
  ];

  constructor(
    private categoryService: CategoryService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  get filteredCategories(): Category[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.categories.filter((category) => {
      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && category.active) ||
        (this.statusFilter === 'inactive' && !category.active);

      if (!matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [category.name, category.description ?? ''].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }

  get totalCount(): number {
    return this.categories.length;
  }

  get activeCount(): number {
    return this.categories.filter((category) => category.active).length;
  }

  get inactiveCount(): number {
    return this.categories.filter((category) => !category.active).length;
  }

  setStatusFilter(filter: CategoryStatusFilter): void {
    this.statusFilter = filter;
  }

  loadCategories(): void {
    this.loading = true;
    this.error = '';

    this.categoryService.list().pipe(
      finalize(() => {
        this.syncView(() => {
          this.loading = false;
        });
      })
    ).subscribe({
      next: (categories) => {
        this.syncView(() => {
          this.categories = categories;
        });
      },
      error: (err: HttpErrorResponse) => {
        const message = this.getErrorMessage(err, 'No se pudieron cargar las categor\u00edas.');

        this.syncView(() => {
          this.error = message;
          this.messageService.add({
            severity: 'error',
            summary: 'Categor\u00edas',
            detail: this.error,
          });
        });
      }
    });
  }

  toggleCategoryStatus(category: Category, nextActiveState: boolean): void {
    const actionLabel = nextActiveState ? 'activar' : 'desactivar';

    if (!nextActiveState) {
      const confirmed = window.confirm(
        `Se va a desactivar la categor\u00eda "${category.name}". Podr\u00e1s volver a activarla despu\u00e9s.`
      );

      if (!confirmed) {
        return;
      }
    }

    this.pendingCategoryId = category.id;

    if (nextActiveState) {
      this.categoryService.update(category.id, { active: true }).pipe(
        finalize(() => {
          this.syncView(() => {
            this.pendingCategoryId = null;
          });
        })
      ).subscribe({
        next: (updatedCategory) => {
          this.syncView(() => {
            this.categories = this.categories.map((item) =>
              item.id === updatedCategory.id ? updatedCategory : item
            );

            this.messageService.add({
              severity: 'success',
              summary: 'Categor\u00edas',
              detail: `La categor\u00eda se pudo ${actionLabel}.`,
            });
          });
        },
        error: (err: HttpErrorResponse) => {
          this.syncView(() => {
            this.messageService.add({
              severity: 'error',
              summary: 'Categor\u00edas',
              detail: this.getErrorMessage(err, `No se pudo ${actionLabel} la categor\u00eda.`),
            });
          });
        }
      });

      return;
    }

    this.categoryService.delete(category.id).pipe(
      finalize(() => {
        this.syncView(() => {
          this.pendingCategoryId = null;
        });
      })
    ).subscribe({
      next: () => {
        this.syncView(() => {
          this.categories = this.categories.map((item) =>
            item.id === category.id
              ? { ...item, active: false }
              : item
          );

          this.messageService.add({
            severity: 'success',
            summary: 'Categor\u00edas',
            detail: `La categor\u00eda se pudo ${actionLabel}.`,
          });
        });
      },
      error: (err: HttpErrorResponse) => {
        this.syncView(() => {
          this.messageService.add({
            severity: 'error',
            summary: 'Categor\u00edas',
            detail: this.getErrorMessage(err, `No se pudo ${actionLabel} la categor\u00eda.`),
          });
        });
      }
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  trackByCategoryId(_index: number, category: Category): number {
    return category.id;
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
    this.ngZone.run(() => {
      action();
      this.cdr.detectChanges();
    });
  }
}
