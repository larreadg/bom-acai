import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { Category, CategoryFormPayload } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';
import { TopbarComponent } from '../../../shared/topbar/topbar.component';

interface CategoryFormValue {
  name: string;
  description: string;
  active: boolean;
}

@Component({
  selector: 'app-category-form',
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
    TagModule,
    TextareaModule,
    TopbarComponent,
  ],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss'
})
export class CategoryFormComponent implements OnInit {
  form: FormGroup;
  categoryId: number | null = null;
  loading = false;
  saving = false;
  error = '';
  categoryReady = true;
  private initialValue: CategoryFormPayload | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(80)]],
      description: ['', [Validators.maxLength(240)]],
      active: [true],
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (!idParam) {
      return;
    }

    const parsedId = Number(idParam);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      this.router.navigate(['/categorias']);
      return;
    }

    this.categoryId = parsedId;
    this.categoryReady = false;
    this.loadCategory(parsedId);
  }

  get isEditMode(): boolean {
    return this.categoryId !== null;
  }

  get title(): string {
    return this.isEditMode ? 'Editar categor\u00eda' : 'Nueva categor\u00eda';
  }

  get subtitle(): string {
    return this.isEditMode
      ? 'Ajust\u00e1 nombre, descripci\u00f3n o disponibilidad sin salir del cat\u00e1logo.'
      : 'Cre\u00e1 una categor\u00eda para organizar productos y mantener el men\u00fa ordenado.';
  }

  get submitLabel(): string {
    return this.isEditMode ? 'Guardar cambios' : 'Crear categor\u00eda';
  }

  get previewName(): string {
    return this.form.get('name')?.value?.trim() || 'Nueva categor\u00eda';
  }

  get previewDescription(): string {
    return this.form.get('description')?.value?.trim() || 'Todav\u00eda no agregaste una descripci\u00f3n.';
  }

  get previewActive(): boolean {
    return !!this.form.get('active')?.value;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();

    if (this.isEditMode && this.initialValue && this.isSamePayload(payload, this.initialValue)) {
      this.syncView(() => {
        this.messageService.add({
          severity: 'info',
          summary: 'Categor\u00edas',
          detail: 'No hay cambios para guardar.',
        });
      });
      return;
    }

    this.saving = true;

    const request$ = this.isEditMode && this.categoryId !== null
      ? this.categoryService.update(this.categoryId, payload)
      : this.categoryService.create(payload);

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
            summary: 'Categor\u00edas',
            detail: this.isEditMode
              ? 'La categor\u00eda se actualiz\u00f3 correctamente.'
              : 'La categor\u00eda se cre\u00f3 correctamente.',
          });
        });

        this.router.navigate(['/categorias']);
      },
      error: (err: HttpErrorResponse) => {
        this.syncView(() => {
          this.error = this.getErrorMessage(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Categor\u00edas',
            detail: this.error,
          });
        });
      }
    });
  }

  private loadCategory(id: number): void {
    this.loading = true;
    this.error = '';

    this.categoryService.getById(id).pipe(
      finalize(() => {
        this.syncView(() => {
          this.loading = false;
        });
      })
    ).subscribe({
      next: (category) => {
        this.syncView(() => {
          const formValue = this.toFormValue(category);
          this.form.reset(formValue);
          this.initialValue = this.buildPayload();
          this.categoryReady = true;
        });
      },
      error: (err: HttpErrorResponse) => {
        this.syncView(() => {
          this.error = this.getErrorMessage(err);
          this.categoryReady = false;
        });
      }
    });
  }

  private toFormValue(category: Category): CategoryFormValue {
    return {
      name: category.name,
      description: category.description ?? '',
      active: category.active,
    };
  }

  private buildPayload(): CategoryFormPayload {
    const rawValue = this.form.getRawValue() as CategoryFormValue;

    return {
      name: rawValue.name.trim(),
      description: rawValue.description.trim() ? rawValue.description.trim() : null,
      active: !!rawValue.active,
    };
  }

  private isSamePayload(a: CategoryFormPayload, b: CategoryFormPayload): boolean {
    return (
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
      return 'La categor\u00eda no existe o fue eliminada.';
    }

    if (err.status === 401) {
      return 'La sesi\u00f3n ya no es v\u00e1lida. Volv\u00e9 a iniciar sesi\u00f3n.';
    }

    return 'No se pudo guardar la categor\u00eda.';
  }

  private syncView(action: () => void): void {
    action();
    this.cdr.detectChanges();
  }
}
