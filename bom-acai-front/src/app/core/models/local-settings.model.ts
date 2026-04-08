export type PaperWidth = 58 | 80;

export interface LocalSettings {
  id: 1;
  paperWidth: PaperWidth;
  /** URL del servicio de impresión local (ej. QZ Tray). Vacío = no configurado. */
  printerUrl: string;
}

export const DEFAULT_SETTINGS: LocalSettings = {
  id: 1,
  paperWidth: 80,
  printerUrl: '',
};
