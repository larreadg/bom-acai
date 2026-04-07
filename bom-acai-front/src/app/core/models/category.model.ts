export interface Category {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string | null;
}

export interface CategoryFormPayload {
  name: string;
  description: string | null;
  active: boolean;
}
