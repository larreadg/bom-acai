import { Component, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private ngZone: NgZone,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    const { username, password } = this.form.getRawValue();

    this.auth.login(username, password).pipe(
      finalize(() => {
        this.ngZone.run(() => {
          this.loading = false;
        });
      })
    ).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.router.navigate(['/']);
        });
      },
      error: (err: HttpErrorResponse) => {
        const message = this.getErrorMessage(err);

        this.ngZone.run(() => {
          this.error = message;
          this.messageService.add({
            severity: 'error',
            summary: 'Inicio de sesi\u00f3n',
            detail: message,
          });
        });
      }
    });
  }

  private getErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim()) {
      return err.error.trim();
    }

    if (err.error && typeof err.error === 'object') {
      const message = err.error.message;
      const error = err.error.error;

      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }

      if (typeof error === 'string' && error.trim()) {
        return error.trim();
      }
    }

    if (err.status === 401) {
      return 'Usuario o contrase\u00f1a incorrectos';
    }

    return 'Error al iniciar sesi\u00f3n';
  }
}
