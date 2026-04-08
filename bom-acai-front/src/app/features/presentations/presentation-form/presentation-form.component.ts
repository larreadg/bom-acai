import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, map, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { Product, PresentationFormPayload, ProductPresentation } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';
import { PresentationService } from '../../../core/services/presentation.service';
import { TopbarComponent } from '../../../shared/topbar/topbar.component';
import { environment } from '../../../../environments/environment';

interface PresentationFormValue {
  productId: number | null;
  name:      string;
  price:     number | null;
  active:    boolean;
}

@Component({
  selector: 'app-presentation-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    SelectModule,
    TagModule,
    TopbarComponent,
  ],
  templateUrl: './presentation-form.component.html',
  styleUrl: './presentation-form.component.scss',
})
export class PresentationFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  products: Product[] = [];
  presentationId: number | null = null;
  loading   = false;
  saving    = false;
  error     = '';
  pageReady = true;

  // Image state
  selectedFile:      File   | null = null;
  previewObjectUrl:  string | null = null;   // blob URL for selected file
  existingImagePath: string | null = null;   // path stored in DB (edit mode)
  removeImage = false;

  private initialValue: PresentationFormPayload | null = null;

  constructor(
    private fb:                  FormBuilder,
    private route:               ActivatedRoute,
    private router:              Router,
    private productService:      ProductService,
    private presentationService: PresentationService,
    private messageService:      MessageService,
    private cdr:                 ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      productId: [null, Validators.required],
      name:      ['',   [Validators.required, Validators.maxLength(80)]],
      price:     [null, [Validators.required, Validators.min(0)]],
      active:    [true],
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      const parsed = Number(idParam);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        this.router.navigate(['/presentaciones']);
        return;
      }
      this.presentationId = parsed;
      this.pageReady = false;
    }

    this.loadData();
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get isEditMode(): boolean { return this.presentationId !== null; }
  get title():  string { return this.isEditMode ? 'Editar presentación' : 'Nueva presentación'; }
  get subtitle(): string {
    return this.isEditMode
      ? 'Modificá el nombre, precio o imagen de esta variante.'
      : 'Agregá una variante nueva a un producto: tamaño, precio e imagen para el punto de venta.';
  }
  get submitLabel(): string { return this.isEditMode ? 'Guardar cambios' : 'Crear presentación'; }
  get hasProducts(): boolean { return this.products.length > 0; }

  get previewName():    string  { return this.form.get('name')?.value?.trim()  || 'Nueva presentación'; }
  get previewPrice():   number  { return this.form.get('price')?.value         ?? 0; }
  get previewActive(): boolean  { return !!this.form.get('active')?.value; }
  get previewProductName(): string {
    const id = this.form.get('productId')?.value;
    return this.products.find(p => p.id === id)?.name ?? 'Sin producto seleccionado';
  }

  /** URL to show in the summary panel — selected file takes priority over DB path */
  get summaryImageUrl(): string | null {
    if (this.removeImage) return null;
    if (this.previewObjectUrl) return this.previewObjectUrl;
    if (this.existingImagePath) return `${environment.apiUrl}/${this.existingImagePath}`;
    return null;
  }

  isFieldInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  // ── Image actions ────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;

    if (!file) return;

    this.revokePreview();
    this.selectedFile     = file;
    this.previewObjectUrl = URL.createObjectURL(file);
    this.removeImage      = false;
    this.syncView(() => {});
  }

  clearFile(): void {
    this.revokePreview();
    this.selectedFile     = null;
    this.previewObjectUrl = null;
  }

  onRemoveExistingImage(): void {
    this.removeImage = true;
    this.clearFile();
    this.syncView(() => {});
  }

  // ── Form submit ──────────────────────────────────────────────────────────

  onSubmit(): void {
    if (!this.hasProducts) {
      this.syncView(() => { this.error = 'Primero necesitás al menos un producto para crear presentaciones.'; });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();

    if (this.isEditMode && this.initialValue && this.isSame(payload, this.initialValue)) {
      this.messageService.add({ severity: 'info', summary: 'Presentaciones', detail: 'No hay cambios para guardar.' });
      return;
    }

    this.saving = true;

    const req$ = this.isEditMode && this.presentationId !== null
      ? this.presentationService.saveForm(this.presentationId, payload)
      : this.presentationService.create(payload);

    req$.pipe(
      finalize(() => this.syncView(() => { this.saving = false; }))
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary:  'Presentaciones',
          detail:   this.isEditMode ? 'Presentación actualizada correctamente.' : 'Presentación creada correctamente.',
        });
        this.router.navigate(['/presentaciones']);
      },
      error: (err: HttpErrorResponse) => {
        this.syncView(() => {
          this.error = this.errMsg(err);
          this.messageService.add({ severity: 'error', summary: 'Presentaciones', detail: this.error });
        });
      },
    });
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  private loadData(): void {
    this.loading = true;
    this.error   = '';

    this.getInitialData().pipe(
      finalize(() => this.syncView(() => { this.loading = false; }))
    ).subscribe({
      next: ({ products, presentation }) => {
        this.syncView(() => {
          this.products = products;

          if (presentation) {
            this.form.reset(this.toFormValue(presentation));
            this.existingImagePath = presentation.imagePath;
            this.initialValue      = this.buildPayload();
          }

          this.pageReady = !this.isEditMode || presentation !== null;
        });
      },
      error: (err: HttpErrorResponse) => {
        this.syncView(() => {
          this.error     = this.errMsg(err);
          this.pageReady = false;
        });
      },
    });
  }

  private getInitialData(): Observable<{ products: Product[]; presentation: ProductPresentation | null }> {
    const products$ = this.productService.list();

    if (this.presentationId === null) {
      return products$.pipe(map(products => ({ products, presentation: null })));
    }

    return forkJoin({
      products:     products$,
      presentation: this.presentationService.getById(this.presentationId),
    });
  }

  // ── Payload helpers ──────────────────────────────────────────────────────

  private toFormValue(p: ProductPresentation): PresentationFormValue {
    return {
      productId: p.productId,
      name:      p.name,
      price:     p.price,
      active:    p.active,
    };
  }

  private buildPayload(): PresentationFormPayload {
    const v = this.form.getRawValue() as PresentationFormValue;

    return {
      productId:   Number(v.productId),
      name:        v.name.trim(),
      price:       Number(v.price),
      active:      !!v.active,
      imageFile:   this.selectedFile,
      removeImage: this.removeImage,
    };
  }

  private isSame(a: PresentationFormPayload, b: PresentationFormPayload): boolean {
    // If there's a new file or a remove-image flag, always save
    if (a.imageFile || a.removeImage) return false;

    return (
      a.productId === b.productId &&
      a.name      === b.name      &&
      a.price     === b.price     &&
      a.active    === b.active
    );
  }

  private revokePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  private errMsg(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();
    if (err.error?.message) return String(err.error.message).trim();
    if (err.status === 404) return 'La presentación no existe o fue eliminada.';
    if (err.status === 401) return 'La sesión ya no es válida. Volvé a iniciar sesión.';
    if (err.status === 409) return 'Ya existe una presentación con esos datos.';
    return 'No se pudo guardar la presentación.';
  }

  private syncView(action: () => void): void {
    action();
    this.cdr.detectChanges();
  }
}
