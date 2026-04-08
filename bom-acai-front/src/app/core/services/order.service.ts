import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Order, OrderCreatePayload } from '../models/order.model';

interface OrderExtraApi {
  id: number | string;
  order_item_id: number | string;
  extra_id: number | string;
  extra_name: string;
  unit_price: number | string;
}

interface OrderItemApi {
  id: number | string;
  order_id: number | string;
  product_presentation_id: number | string;
  product_id: number | string;
  product_name: string;
  presentation_name: string;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
  notes: string | null;
  extras: OrderExtraApi[];
}

interface OrderApi {
  id: number | string;
  status: string;
  total: number | string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  items: OrderItemApi[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly baseUrl = `${environment.apiUrl}/api/orders`;

  constructor(private http: HttpClient) {}

  create(payload: OrderCreatePayload): Observable<Order> {
    return this.http
      .post<ApiResponse<OrderApi>>(this.baseUrl, payload)
      .pipe(map(res => this.toModel(res.data)));
  }

  private toModel(order: OrderApi): Order {
    return {
      id: Number(order.id),
      status: order.status,
      total: Number(order.total),
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: order.items.map(item => ({
        id: Number(item.id),
        orderId: Number(item.order_id),
        productPresentationId: Number(item.product_presentation_id),
        productId: Number(item.product_id),
        productName: item.product_name,
        presentationName: item.presentation_name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        subtotal: Number(item.subtotal),
        notes: item.notes,
        extras: item.extras.map(extra => ({
          id: Number(extra.id),
          orderItemId: Number(extra.order_item_id),
          extraId: Number(extra.extra_id),
          extraName: extra.extra_name,
          unitPrice: Number(extra.unit_price),
        })),
      })),
    };
  }
}
