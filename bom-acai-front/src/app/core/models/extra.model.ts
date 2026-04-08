export interface Extra {
  id: number;
  name: string;
  costPrice: number;
  salePrice: number;
  active: boolean;
}

export interface ExtraFormPayload {
  name: string;
  costPrice: number;
  salePrice: number;
  active: boolean;
}
