import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
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
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { AuthService, CaptchaData } from '../../../core/services/auth.service';

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
    ProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  loading        = false;
  captchaLoading = false;
  error          = '';
  captcha: CaptchaData | null = null;

  constructor(
    private fb:             FormBuilder,
    private auth:           AuthService,
    private router:         Router,
    private ngZone:         NgZone,
    private cdr:            ChangeDetectorRef,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      username:      ['', Validators.required],
      password:      ['', Validators.required],
      captchaAnswer: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadCaptcha();
  }

  loadCaptcha(): void {
    this.captchaLoading = true;
    this.form.get('captchaAnswer')?.reset('');

    this.auth.getCaptcha().pipe(
      finalize(() => { this.captchaLoading = false; this.cdr.detectChanges(); })
    ).subscribe({
      next:  data => { this.captcha = data;  this.cdr.detectChanges(); },
      error: ()   => { this.captcha = null;  this.cdr.detectChanges(); },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.captcha) {
      this.loadCaptcha();
      return;
    }

    this.loading = true;
    this.error   = '';

    const { username, password, captchaAnswer } = this.form.getRawValue();

    this.auth.login(username, password, this.captcha.token, captchaAnswer).pipe(
      finalize(() => {
        this.ngZone.run(() => { this.loading = false; });
      })
    ).subscribe({
      next: () => {
        this.ngZone.run(() => { this.router.navigate(['/']); });
      },
      error: (err: HttpErrorResponse) => {
        const message = this.getErrorMessage(err);

        this.ngZone.run(() => {
          this.error = message;
          this.messageService.add({ severity: 'error', summary: 'Inicio de sesión', detail: message });

          // Always refresh captcha after a failed attempt
          this.loadCaptcha();
        });
      },
    });
  }

  private getErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();

    if (err.error && typeof err.error === 'object') {
      const msg = err.error.message;
      if (typeof msg === 'string' && msg.trim()) return msg.trim();
    }

    if (err.status === 401) return 'Usuario o contraseña incorrectos.';
    if (err.status === 400) return err.error?.message ?? 'Verificá los datos ingresados.';

    return 'Error al iniciar sesión.';
  }
}
