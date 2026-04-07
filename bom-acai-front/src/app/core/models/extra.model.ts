export interface Extra {
  id: number;
  name: string;
  price: number;
  active: boolean;
}

export interface ExtraFormPayload {
  name: string;
  price: number;
  active: boolean;
}
