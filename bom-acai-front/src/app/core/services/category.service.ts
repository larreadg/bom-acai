import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Category, CategoryFormPayload } from '../models/category.model';

interface CategoryApi {
  id: number | string;
  name: string;
  description: string | null;
  active: number | string | boolean;
  created_at?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly baseUrl = `${environment.apiUrl}/api/categories`;

  constructor(private http: HttpClient) {}

  list(): Observable<Category[]> {
    return this.http
      .get<ApiResponse<CategoryApi[]>>(this.baseUrl)
      .pipe(map((response) => response.data.map((category) => this.toCategory(category))));
  }

  getById(id: number): Observable<Category> {
    return this.http
      .get<ApiResponse<CategoryApi>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => this.toCategory(response.data)));
  }

  create(payload: CategoryFormPayload): Observable<Category> {
    return this.http
      .post<ApiResponse<CategoryApi>>(this.baseUrl, this.toRequestPayload(payload))
      .pipe(map((response) => this.toCategory(response.data)));
  }

  update(id: number, payload: Partial<CategoryFormPayload>): Observable<Category> {
    return this.http
      .put<ApiResponse<CategoryApi>>(`${this.baseUrl}/${id}`, this.toRequestPayload(payload))
      .pipe(map((response) => this.toCategory(response.data)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  private toCategory(category: CategoryApi): Category {
    return {
      id: Number(category.id),
      name: category.name,
      description: category.description ?? null,
      active: this.toBoolean(category.active),
      createdAt: category.created_at ?? null,
    };
  }

  private toRequestPayload(payload: Partial<CategoryFormPayload>): Record<string, string | number | null> {
    const request: Record<string, string | number | null> = {};

    if (payload.name !== undefined) {
      request['name'] = payload.name.trim();
    }

    if ('description' in payload) {
      const description = payload.description?.trim() ?? '';
      request['description'] = description ? description : null;
    }

    if (payload.active !== undefined) {
      request['active'] = payload.active ? 1 : 0;
    }

    return request;
  }

  private toBoolean(value: number | string | boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    return Number(value) === 1;
  }
}
