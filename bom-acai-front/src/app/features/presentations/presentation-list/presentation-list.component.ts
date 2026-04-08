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

import { ProductPresentation } from '../../../core/models/product.model';
import { PresentationService } from '../../../core/services/presentation.service';
import { TopbarComponent } from '../../../shared/topbar/topbar.component';
import { environment } from '../../../../environments/environment';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-presentation-list',
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
  templateUrl: './presentation-list.component.html',
  styleUrl: './presentation-list.component.scss',
})
export class PresentationListComponent implements OnInit {
  readonly apiUrl = environment.apiUrl;

  presentations: ProductPresentation[] = [];
  searchTerm    = '';
  statusFilter: StatusFilter = 'all';
  loading  = false;
  error    = '';
  pendingId: number | null = null;

  readonly statusFilters: Array<{ label: string; value: StatusFilter }> = [
    { label: 'Todas',    value: 'all' },
    { label: 'Activas',  value: 'active' },
    { label: 'Inactivas', value: 'inactive' },
  ];

  constructor(
    private service: PresentationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get filtered(): ProductPresentation[] {
    const q = this.searchTerm.trim().toLowerCase();

    return this.presentations.filter(p => {
      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active'   && p.active) ||
        (this.statusFilter === 'inactive' && !p.active);

      if (!matchesStatus) return false;
      if (!q) return true;

      return [p.name, p.productName].join(' ').toLowerCase().includes(q);
    });
  }

  get totalCount():    number { return this.presentations.length; }
  get activeCount():   number { return this.presentations.filter(p =>  p.active).length; }
  get inactiveCount(): number { return this.presentations.filter(p => !p.active).length; }

  setStatusFilter(f: StatusFilter): void { this.statusFilter = f; }
  clearSearch(): void { this.searchTerm = ''; }

  load(): void {
    this.loading = true;
    this.error   = '';

    this.service.list().pipe(
      finalize(() => this.syncView(() => { this.loading = false; }))
    ).subscribe({
      next:  ps  => this.syncView(() => { this.presentations = ps; }),
      error: err => {
        const msg = this.errMsg(err, 'No se pudieron cargar las presentaciones.');
        this.syncView(() => {
          this.error = msg;
          this.messageService.add({ severity: 'error', summary: 'Presentaciones', detail: msg });
        });
      },
    });
  }

  toggle(p: ProductPresentation, nextActive: boolean): void {
    if (!nextActive) {
      const ok = window.confirm(
        `Se va a desactivar "${p.name}" (${p.productName}). Podés volver a activarla después.`
      );
      if (!ok) return;
    }

    this.pendingId = p.id;

    const onSuccess = () => this.syncView(() => {
      this.presentations = this.presentations.map(item =>
        item.id === p.id ? { ...item, active: nextActive } : item
      );
      this.messageService.add({
        severity: 'success',
        summary:  'Presentaciones',
        detail:   `La presentación se ${nextActive ? 'activó' : 'desactivó'} correctamente.`,
      });
    });

    const onError = (err: HttpErrorResponse) => this.syncView(() => {
      this.messageService.add({
        severity: 'error',
        summary:  'Presentaciones',
        detail:   this.errMsg(err, `No se pudo ${nextActive ? 'activar' : 'desactivar'} la presentación.`),
      });
    });

    const finalizeFn = () => this.syncView(() => { this.pendingId = null; });

    if (nextActive) {
      this.service.update(p.id, { active: true }).pipe(finalize(finalizeFn)).subscribe({ next: onSuccess, error: onError });
    } else {
      this.service.delete(p.id).pipe(finalize(finalizeFn)).subscribe({ next: onSuccess, error: onError });
    }
  }

  private errMsg(err: HttpErrorResponse, fallback: string): string {
    if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();
    if (err.error?.message) return String(err.error.message).trim();
    if (err.status === 401) return 'La sesión ya no es válida. Volvé a iniciar sesión.';
    return fallback;
  }

  private syncView(action: () => void): void {
    action();
    this.cdr.detectChanges();
  }
}
