export interface OrderCreateItemPayload {
  product_presentation_id: number;
  quantity: number;
  extras?: number[];
  notes?: string | null;
}

export interface OrderCreatePayload {
  notes?: string | null;
  items: OrderCreateItemPayload[];
}

export interface OrderItemExtra {
  id: number;
  orderItemId: number;
  extraId: number;
  extraName: string;
  unitPrice: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productPresentationId: number;
  productId: number;
  productName: string;
  presentationName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  extras: OrderItemExtra[];
}

export interface Order {
  id: number;
  status: string;
  total: number;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  items: OrderItem[];
}
