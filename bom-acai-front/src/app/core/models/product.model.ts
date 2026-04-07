export interface ProductPresentation {
  id: number;
  productId: number;
  productName: string;
  name: string;
  price: number;
  imageUrl: string | null;
  imagePath: string | null;
  active: boolean;
}

export interface PresentationFormPayload {
  productId: number;
  name: string;
  price: number;
  active: boolean;
  imageFile: File | null;
  removeImage: boolean;
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
