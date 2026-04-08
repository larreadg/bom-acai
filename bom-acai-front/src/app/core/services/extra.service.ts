import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Extra, ExtraFormPayload } from '../models/extra.model';

interface ExtraApi {
  id: number | string;
  name: string;
  cost_price: number | string;
  sale_price: number | string;
  active: number | string | boolean;
}

@Injectable({ providedIn: 'root' })
export class ExtraService {
  private readonly baseUrl = `${environment.apiUrl}/api/extras`;

  constructor(private http: HttpClient) {}

  list(): Observable<Extra[]> {
    return this.http
      .get<ApiResponse<ExtraApi[]>>(this.baseUrl)
      .pipe(map(res => res.data.map(e => this.toModel(e))));
  }

  getById(id: number): Observable<Extra> {
    return this.http
      .get<ApiResponse<ExtraApi>>(`${this.baseUrl}/${id}`)
      .pipe(map(res => this.toModel(res.data)));
  }

  create(payload: ExtraFormPayload): Observable<Extra> {
    return this.http
      .post<ApiResponse<ExtraApi>>(this.baseUrl, this.toRequest(payload))
      .pipe(map(res => this.toModel(res.data)));
  }

  update(id: number, payload: Partial<ExtraFormPayload>): Observable<Extra> {
    return this.http
      .put<ApiResponse<ExtraApi>>(`${this.baseUrl}/${id}`, this.toRequest(payload))
      .pipe(map(res => this.toModel(res.data)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  private toModel(e: ExtraApi): Extra {
    return {
      id:        Number(e.id),
      name:      e.name,
      costPrice: Number(e.cost_price),
      salePrice: Number(e.sale_price),
      active:    typeof e.active === 'boolean' ? e.active : Number(e.active) === 1,
    };
  }

  private toRequest(payload: Partial<ExtraFormPayload>): Record<string, unknown> {
    const req: Record<string, unknown> = {};
    if (payload.name      !== undefined) req['name'] = payload.name.trim();
    if (payload.costPrice !== undefined) req['cost_price'] = payload.costPrice;
    if (payload.salePrice !== undefined) req['sale_price'] = payload.salePrice;
    if (payload.active    !== undefined) req['active'] = payload.active ? 1 : 0;
    return req;
  }
}
