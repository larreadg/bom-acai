import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Order, OrderCreatePayload, OrderListResult } from '../models/order.model';

export interface OrderFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

interface OrderExtraApi {
  id: number | string;
  order_item_id: number | string;
  extra_id: number | string;
  extra_name: string;
  unit_cost: number | string;
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
  unit_cost: number | string;
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

  list(filters: OrderFilters = {}): Observable<OrderListResult> {
    let params = new HttpParams();
    if (filters.dateFrom) params = params.set('date_from', filters.dateFrom);
    if (filters.dateTo)   params = params.set('date_to',   filters.dateTo);
    if (filters.status)   params = params.set('status',    filters.status);

    return this.http
      .get<ApiResponse<{ summary: { total_orders: number; total_amount: number; total_cost: number; total_profit: number; cancelled_orders: number }; orders: OrderApi[] }>>(
        this.baseUrl, { params }
      )
      .pipe(
        map(res => ({
          summary: {
            totalOrders:     res.data.summary.total_orders,
            totalAmount:     res.data.summary.total_amount,
            totalCost:       res.data.summary.total_cost,
            totalProfit:     res.data.summary.total_profit,
            cancelledOrders: res.data.summary.cancelled_orders,
          },
          orders: res.data.orders.map(o => this.toModel(o)),
        }))
      );
  }

  cancel(id: number): Observable<Order> {
    return this.http
      .patch<ApiResponse<OrderApi>>(`${this.baseUrl}/${id}/cancel`, {})
      .pipe(map(res => this.toModel(res.data)));
  }

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
        unitCost: Number(item.unit_cost),
        unitPrice: Number(item.unit_price),
        subtotal: Number(item.subtotal),
        notes: item.notes,
        extras: item.extras.map(extra => ({
          id: Number(extra.id),
          orderItemId: Number(extra.order_item_id),
          extraId: Number(extra.extra_id),
          extraName: extra.extra_name,
          unitCost: Number(extra.unit_cost),
          unitPrice: Number(extra.unit_price),
        })),
      })),
    };
  }
}
