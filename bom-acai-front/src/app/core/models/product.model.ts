export interface ProductPresentation {
  id: number;
  name: string;
  price: number;
  active: boolean;
}

export interface Product {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string | null;
  presentations: ProductPresentation[];
}

export interface ProductFormPayload {
  categoryId: number;
  name: string;
  description: string | null;
  active: boolean;
}
