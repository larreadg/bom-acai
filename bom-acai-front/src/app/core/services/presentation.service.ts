import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PresentationFormPayload, ProductPresentation } from '../models/product.model';

interface PresentationApi {
  id: number | string;
  product_id: number | string;
  product_name: string;
  name: string;
  cost_price: number | string;
  sale_price: number | string;
  image_url: string | null;
  image_path: string | null;
  active: number | string | boolean;
}

@Injectable({ providedIn: 'root' })
export class PresentationService {
  private readonly baseUrl = `${environment.apiUrl}/api/presentations`;

  constructor(private http: HttpClient) {}

  list(): Observable<ProductPresentation[]> {
    return this.http
      .get<ApiResponse<PresentationApi[]>>(this.baseUrl)
      .pipe(map(res => res.data.map(p => this.toModel(p))));
  }

  getById(id: number): Observable<ProductPresentation> {
    return this.http
      .get<ApiResponse<PresentationApi>>(`${this.baseUrl}/${id}`)
      .pipe(map(res => this.toModel(res.data)));
  }

  /** Create — multipart/form-data POST */
  create(payload: PresentationFormPayload): Observable<ProductPresentation> {
    return this.http
      .post<ApiResponse<PresentationApi>>(this.baseUrl, this.toFormData(payload))
      .pipe(map(res => this.toModel(res.data)));
  }

  /** Form save in edit mode — multipart/form-data POST to /presentations/:id */
  saveForm(id: number, payload: PresentationFormPayload): Observable<ProductPresentation> {
    return this.http
      .post<ApiResponse<PresentationApi>>(`${this.baseUrl}/${id}`, this.toFormData(payload))
      .pipe(map(res => this.toModel(res.data)));
  }

  /** JSON-only PATCH — used for toggle active from the list */
  update(id: number, patch: { active: boolean }): Observable<ProductPresentation> {
    return this.http
      .put<ApiResponse<PresentationApi>>(`${this.baseUrl}/${id}`, { active: patch.active ? 1 : 0 })
      .pipe(map(res => this.toModel(res.data)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private toFormData(payload: PresentationFormPayload): FormData {
    const fd = new FormData();
    fd.append('product_id',   String(payload.productId));
    fd.append('name',         payload.name.trim());
    fd.append('cost_price',   String(payload.costPrice));
    fd.append('sale_price',   String(payload.salePrice));
    fd.append('active',       payload.active ? '1' : '0');
    fd.append('remove_image', payload.removeImage ? '1' : '0');

    if (payload.imageFile) {
      fd.append('image', payload.imageFile);
    }

    return fd;
  }

  private toModel(p: PresentationApi): ProductPresentation {
    return {
      id:          Number(p.id),
      productId:   Number(p.product_id),
      productName: p.product_name,
      name:        p.name,
      costPrice:   Number(p.cost_price),
      salePrice:   Number(p.sale_price),
      imageUrl:    p.image_url  ?? null,
      imagePath:   p.image_path ?? null,
      active:      this.toBool(p.active),
    };
  }

  private toBool(value: number | string | boolean): boolean {
    return typeof value === 'boolean' ? value : Number(value) === 1;
  }
}
