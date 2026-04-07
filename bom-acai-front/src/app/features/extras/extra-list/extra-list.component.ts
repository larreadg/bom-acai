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

import { Extra } from '../../../core/models/extra.model';
import { AuthService } from '../../../core/services/auth.service';
import { ExtraService } from '../../../core/services/extra.service';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-extra-list',
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
  templateUrl: './extra-list.component.html',
  styleUrl: './extra-list.component.scss',
})
export class ExtraListComponent implements OnInit {
  extras: Extra[] = [];
  searchTerm   = '';
  statusFilter: StatusFilter = 'all';
  loading  = false;
  error    = '';
  pendingId: number | null = null;

  readonly statusFilters: Array<{ label: string; value: StatusFilter }> = [
    { label: 'Todos',     value: 'all' },
    { label: 'Activos',   value: 'active' },
    { label: 'Inactivos', value: 'inactive' },
  ];

  constructor(
    private service:      ExtraService,
    private messageService: MessageService,
    private cdr:          ChangeDetectorRef,
    public  auth:         AuthService,
  ) {}

  ngOnInit(): void { this.load(); }

  get filtered(): Extra[] {
    const q = this.searchTerm.trim().toLowerCase();

    return this.extras.filter(e => {
      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active'   &&  e.active) ||
        (this.statusFilter === 'inactive' && !e.active);

      if (!matchesStatus) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q);
    });
  }

  get totalCount():    number { return this.extras.length; }
  get activeCount():   number { return this.extras.filter(e =>  e.active).length; }
  get inactiveCount(): number { return this.extras.filter(e => !e.active).length; }

  setStatusFilter(f: StatusFilter): void { this.statusFilter = f; }
  clearSearch(): void { this.searchTerm = ''; }

  load(): void {
    this.loading = true;
    this.error   = '';

    this.service.list().pipe(
      finalize(() => this.syncView(() => { this.loading = false; }))
    ).subscribe({
      next:  extras => this.syncView(() => { this.extras = extras; }),
      error: (err: HttpErrorResponse) => {
        const msg = this.errMsg(err, 'No se pudieron cargar los extras.');
        this.syncView(() => {
          this.error = msg;
          this.messageService.add({ severity: 'error', summary: 'Extras', detail: msg });
        });
      },
    });
  }

  toggle(e: Extra, nextActive: boolean): void {
    if (!nextActive) {
      const ok = window.confirm(
        `Se va a desactivar "${e.name}". Podés volver a activarlo después.`
      );
      if (!ok) return;
    }

    this.pendingId = e.id;

    const finalizeFn = () => this.syncView(() => { this.pendingId = null; });

    const onError = (err: HttpErrorResponse) => this.syncView(() => {
      this.messageService.add({
        severity: 'error',
        summary:  'Extras',
        detail:   this.errMsg(err, `No se pudo ${nextActive ? 'activar' : 'desactivar'} el extra.`),
      });
    });

    if (nextActive) {
      this.service.update(e.id, { active: true }).pipe(finalize(finalizeFn)).subscribe({
        next: updated => this.syncView(() => {
          this.extras = this.extras.map(item => item.id === e.id ? updated : item);
          this.messageService.add({ severity: 'success', summary: 'Extras', detail: 'El extra se activó correctamente.' });
        }),
        error: onError,
      });
    } else {
      this.service.delete(e.id).pipe(finalize(finalizeFn)).subscribe({
        next: () => this.syncView(() => {
          this.extras = this.extras.map(item => item.id === e.id ? { ...item, active: false } : item);
          this.messageService.add({ severity: 'success', summary: 'Extras', detail: 'El extra se desactivó correctamente.' });
        }),
        error: onError,
      });
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
