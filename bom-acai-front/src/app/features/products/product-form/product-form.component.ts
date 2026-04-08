import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, map, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { Category } from '../../../core/models/category.model';
import { Product, ProductFormPayload } from '../../../core/models/product.model';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { TopbarComponent } from '../../../shared/topbar/topbar.component';

interface ProductFormValue {
  categoryId: number | null;
  name: string;
  description: string;
  active: boolean;
}

interface ProductFormData {
  categories: Category[];
  product: Product | null;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    SelectModule,
    TagModule,
    TextareaModule,
    TopbarComponent,
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit {
  form: FormGroup;
  categories: Category[] = [];
  productId: number | null = null;
  loading = false;
  saving = false;
  error = '';
  pageReady = true;
  presentationsCount = 0;
  private initialValue: ProductFormPayload | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService,
    private productService: ProductService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      categoryId: [null, Validators.required],
      name: ['', [Validators.required, Validators.maxLength(80)]],
      description: ['', [Validators.maxLength(240)]],
      active: [true],
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      const parsedId = Number(idParam);

      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        this.router.navigate(['/productos']);
        return;
      }

      this.productId = parsedId;
      this.pageReady = false;
    }

    this.loadData();
  }

  get isEditMode(): boolean {
    return this.productId !== null;
  }

  get title(): string {
    return this.isEditMode ? 'Editar producto' : 'Nuevo producto';
  }

  get subtitle(): string {
    return this.isEditMode
      ? 'Actualiz\u00e1 categor\u00eda, descripci\u00f3n o disponibilidad sin salir del cat\u00e1logo.'
      : 'Cre\u00e1 un producto nuevo y vinculalo a la categor\u00eda correcta para mantener ordenado el men\u00fa.';
  }

  get submitLabel(): string {
    return this.isEditMode ? 'Guardar cambios' : 'Crear producto';
  }

  get previewName(): string {
    return this.form.get('name')?.value?.trim() || 'Nuevo producto';
  }

  get previewDescription(): string {
    return this.form.get('description')?.value?.trim() || 'Todav\u00eda no agregaste una descripci\u00f3n.';
  }

  get previewActive(): boolean {
    return !!this.form.get('active')?.value;
  }

  get previewCategoryName(): string {
    const categoryId = this.form.get('categoryId')?.value;
    const category = this.categories.find((item) => item.id === categoryId);
    return category?.name ?? 'Sin categor\u00eda seleccionada';
  }

  get hasCategories(): boolean {
    return this.categories.length > 0;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  onSubmit(): void {
    if (!this.hasCategories) {
      this.syncView(() => {
        this.error = 'Primero necesit\u00e1s al menos una categor\u00eda para crear productos.';
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();

    if (this.isEditMode && this.initialValue && this.isSamePayload(payload, this.initialValue)) {
      this.syncView(() => {
        this.messageService.add({
          severity: 'info',
          summary: 'Productos',
          detail: 'No hay cambios para guardar.',
        });
      });
      return;
    }

    this.saving = true;

    const request$ = this.isEditMode && this.productId !== null
      ? this.productService.update(this.productId, payload)
      : this.productService.create(payload);

    request$.pipe(
      finalize(() => {
        this.syncView(() => {
          this.saving = false;
        });
      })
    ).subscribe({
      next: () => {
        this.syncView(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Productos',
            detail: this.isEditMode
              ? 'El producto se actualiz\u00f3 correctamente.'
              : 'El producto se cre\u00f3 correctamente.',
          });
        });

        this.router.navigate(['/productos']);
      },
      error: (err: HttpErrorResponse) => {
        this.syncView(() => {
          this.error = this.getErrorMessage(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Productos',
            detail: this.error,
          });
        });
      }
    });
  }

  private loadData(): void {
    this.loading = true;
    this.error = '';

    this.getInitialRequest().pipe(
      finalize(() => {
        this.syncView(() => {
          this.loading = false;
        });
      })
    ).subscribe({
      next: (data) => {
        this.syncView(() => {
          this.categories = data.categories;
          this.presentationsCount = data.product?.presentations.length ?? 0;

          if (data.product) {
            this.form.reset(this.toFormValue(data.product));
            this.initialValue = this.buildPayload();
          } else {
            this.initialValue = null;
          }

          this.pageReady = !this.isEditMode || data.product !== null;
        });
      },
      error: (err: HttpErrorResponse) => {
        this.syncView(() => {
          this.error = this.getErrorMessage(err);
          this.pageReady = false;
        });
      }
    });
  }

  private getInitialRequest(): Observable<ProductFormData> {
    const categories$ = this.categoryService.list();

    if (this.productId === null) {
      return categories$.pipe(
        map((categories) => ({ categories, product: null }))
      );
    }

    return forkJoin({
      categories: categories$,
      product: this.productService.getById(this.productId),
    });
  }

  private toFormValue(product: Product): ProductFormValue {
    return {
      categoryId: product.categoryId,
      name: product.name,
      description: product.description ?? '',
      active: product.active,
    };
  }

  private buildPayload(): ProductFormPayload {
    const rawValue = this.form.getRawValue() as ProductFormValue;

    return {
      categoryId: Number(rawValue.categoryId),
      name: rawValue.name.trim(),
      description: rawValue.description.trim() ? rawValue.description.trim() : null,
      active: !!rawValue.active,
    };
  }

  private isSamePayload(a: ProductFormPayload, b: ProductFormPayload): boolean {
    return (
      a.categoryId === b.categoryId &&
      a.name === b.name &&
      a.description === b.description &&
      a.active === b.active
    );
  }

  private getErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim()) {
      return err.error.trim();
    }

    if (err.error && typeof err.error === 'object' && typeof err.error.message === 'string') {
      return err.error.message.trim();
    }

    if (err.status === 404) {
      return 'El producto no existe o fue eliminado.';
    }

    if (err.status === 401) {
      return 'La sesi\u00f3n ya no es v\u00e1lida. Volv\u00e9 a iniciar sesi\u00f3n.';
    }

    if (err.status === 409) {
      return 'Ya existe un producto con esos datos.';
    }

    return 'No se pudo guardar el producto.';
  }

  private syncView(action: () => void): void {
    action();
    this.cdr.detectChanges();
  }
}
