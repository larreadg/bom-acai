import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';

import { Extra, ExtraFormPayload } from '../../../core/models/extra.model';
import { ExtraService } from '../../../core/services/extra.service';
import { TopbarComponent } from '../../../shared/topbar/topbar.component';

interface ExtraFormValue {
  name:      string;
  costPrice: number | null;
  salePrice: number | null;
  active:    boolean;
}

@Component({
  selector: 'app-extra-form',
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
    TagModule,
    TopbarComponent,
  ],
  templateUrl: './extra-form.component.html',
  styleUrl: './extra-form.component.scss',
})
export class ExtraFormComponent implements OnInit {
  form: FormGroup;
  extraId: number | null = null;
  loading  = false;
  saving   = false;
  error    = '';
  pageReady = true;
  private initialValue: ExtraFormPayload | null = null;

  constructor(
    private fb:             FormBuilder,
    private route:          ActivatedRoute,
    private router:         Router,
    private service:        ExtraService,
    private messageService: MessageService,
    private cdr:            ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      name:      ['',   [Validators.required, Validators.maxLength(80)]],
      costPrice: [null, [Validators.required, Validators.min(0)]],
      salePrice: [null, [Validators.required, Validators.min(0)]],
      active:    [true],
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      const parsed = Number(idParam);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        this.router.navigate(['/extras']);
        return;
      }
      this.extraId  = parsed;
      this.pageReady = false;
    }

    if (this.extraId !== null) {
      this.loadExtra();
    }
  }

  get isEditMode(): boolean { return this.extraId !== null; }
  get title():  string { return this.isEditMode ? 'Editar extra' : 'Nuevo extra'; }
  get subtitle(): string {
    return this.isEditMode
      ? 'Modificá el nombre o precio de este topping.'
      : 'Agregá un topping o ingrediente extra que los clientes pueden sumar a su pedido.';
  }
  get submitLabel(): string { return this.isEditMode ? 'Guardar cambios' : 'Crear extra'; }

  get previewName():      string  { return this.form.get('name')?.value?.trim() || 'Nuevo extra'; }
  get previewCostPrice(): number  { return this.form.get('costPrice')?.value ?? 0; }
  get previewSalePrice(): number  { return this.form.get('salePrice')?.value ?? 0; }
  get previewActive():    boolean { return !!this.form.get('active')?.value; }

  isFieldInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();

    if (this.isEditMode && this.initialValue && this.isSame(payload, this.initialValue)) {
      this.messageService.add({ severity: 'info', summary: 'Extras', detail: 'No hay cambios para guardar.' });
      return;
    }

    this.saving = true;

    const req$ = this.isEditMode && this.extraId !== null
      ? this.service.update(this.extraId, payload)
      : this.service.create(payload);

    req$.pipe(
      finalize(() => this.syncView(() => { this.saving = false; }))
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary:  'Extras',
          detail:   this.isEditMode ? 'Extra actualizado correctamente.' : 'Extra creado correctamente.',
        });
        this.router.navigate(['/extras']);
      },
      error: (err: HttpErrorResponse) => {
        this.syncView(() => {
          this.error = this.errMsg(err);
          this.messageService.add({ severity: 'error', summary: 'Extras', detail: this.error });
        });
      },
    });
  }

  private loadExtra(): void {
    this.loading = true;
    this.error   = '';

    this.service.getById(this.extraId!).pipe(
      finalize(() => this.syncView(() => { this.loading = false; }))
    ).subscribe({
      next: (extra: Extra) => {
        this.syncView(() => {
          this.form.reset({
            name: extra.name,
            costPrice: extra.costPrice,
            salePrice: extra.salePrice,
            active: extra.active,
          });
          this.initialValue = this.buildPayload();
          this.pageReady    = true;
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

  private buildPayload(): ExtraFormPayload {
    const v = this.form.getRawValue() as ExtraFormValue;
    return {
      name: v.name.trim(),
      costPrice: Number(v.costPrice),
      salePrice: Number(v.salePrice),
      active: !!v.active,
    };
  }

  private isSame(a: ExtraFormPayload, b: ExtraFormPayload): boolean {
    return (
      a.name === b.name &&
      a.costPrice === b.costPrice &&
      a.salePrice === b.salePrice &&
      a.active === b.active
    );
  }

  private errMsg(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();
    if (err.error?.message) return String(err.error.message).trim();
    if (err.status === 404) return 'El extra no existe o fue eliminado.';
    if (err.status === 401) return 'La sesión ya no es válida. Volvé a iniciar sesión.';
    if (err.status === 409) return 'Ya existe un extra con ese nombre.';
    return 'No se pudo guardar el extra.';
  }

  private syncView(action: () => void): void {
    action();
    this.cdr.detectChanges();
  }
}
