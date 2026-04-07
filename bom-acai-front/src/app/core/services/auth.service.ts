import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  code: number;
  status: string;
  message: string;
  data: {
    token: string;
    expires_at: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY    = 'bom_acai_token';
  private readonly EXPIRES_KEY  = 'bom_acai_expires_at';

  isLoggedIn = signal<boolean>(this.checkAuthenticated());

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap(res => {
          localStorage.setItem(this.TOKEN_KEY,   res.data.token);
          localStorage.setItem(this.EXPIRES_KEY, res.data.expires_at);
          this.isLoggedIn.set(true);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_KEY);
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.checkAuthenticated();
  }

  private checkAuthenticated(): boolean {
    const token     = localStorage.getItem(this.TOKEN_KEY);
    const expiresAt = localStorage.getItem(this.EXPIRES_KEY);
    if (!token || !expiresAt) return false;
    return new Date(expiresAt) > new Date();
  }
}
