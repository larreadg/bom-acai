import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Product, ProductFormPayload, ProductPresentation } from '../models/product.model';

interface ProductPresentationApi {
  id: number | string;
  name: string;
  price: number | string;
  active: number | string | boolean;
}

interface ProductApi {
  id: number | string;
  category_id: number | string;
  category_name: string;
  name: string;
  description: string | null;
  active: number | string | boolean;
  created_at?: string | null;
  presentations?: ProductPresentationApi[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly baseUrl = `${environment.apiUrl}/api/products`;

  constructor(private http: HttpClient) {}

  list(): Observable<Product[]> {
    return this.http
      .get<ApiResponse<ProductApi[]>>(this.baseUrl)
      .pipe(map((response) => response.data.map((product) => this.toProduct(product))));
  }

  getById(id: number): Observable<Product> {
    return this.http
      .get<ApiResponse<ProductApi>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => this.toProduct(response.data)));
  }

  create(payload: ProductFormPayload): Observable<Product> {
    return this.http
      .post<ApiResponse<ProductApi>>(this.baseUrl, this.toRequestPayload(payload))
      .pipe(map((response) => this.toProduct(response.data)));
  }

  update(id: number, payload: Partial<ProductFormPayload>): Observable<Product> {
    return this.http
      .put<ApiResponse<ProductApi>>(`${this.baseUrl}/${id}`, this.toRequestPayload(payload))
      .pipe(map((response) => this.toProduct(response.data)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  private toProduct(product: ProductApi): Product {
    return {
      id: Number(product.id),
      categoryId: Number(product.category_id),
      categoryName: product.category_name,
      name: product.name,
      description: product.description ?? null,
      active: this.toBoolean(product.active),
      createdAt: product.created_at ?? null,
      presentations: (product.presentations ?? []).map((presentation) => this.toPresentation(presentation)),
    };
  }

  private toPresentation(presentation: ProductPresentationApi): ProductPresentation {
    return {
      id:          Number(presentation.id),
      productId:   0,
      productName: '',
      name:        presentation.name,
      price:       Number(presentation.price),
      imageUrl:    null,
      imagePath:   null,
      active:      this.toBoolean(presentation.active),
    };
  }

  private toRequestPayload(payload: Partial<ProductFormPayload>): Record<string, string | number | null> {
    const request: Record<string, string | number | null> = {};

    if (payload.categoryId !== undefined) {
      request['category_id'] = payload.categoryId;
    }

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
