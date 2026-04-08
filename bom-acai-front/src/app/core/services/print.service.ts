import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import html2canvas from 'html2canvas';
import * as qz from 'qz-tray';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Order } from '../models/order.model';
import { LocalSettingsService } from './local-settings.service';

export interface PrintResult {
  success: boolean;
  method: 'qztray' | 'download';
  message: string;
}

interface QzCertificateApi {
  certificate: string;
}

interface QzSignatureApi {
  signature: string;
}

const PAPER_PX: Record<number, number> = {
  58: 220,
  80: 302,
};

const PAPER_CHARS: Record<number, number> = {
  58: 32,
  80: 48,
};

const ESC = '\x1B';
const GS = '\x1D';

@Injectable({ providedIn: 'root' })
export class PrintService {
  private securityConfigured = false;
  private readonly qzCertificateUrl = `${environment.apiUrl}/api/qz/certificate`;
  private readonly qzSignUrl = `${environment.apiUrl}/api/qz/sign`;

  constructor(
    private readonly localSettings: LocalSettingsService,
    private readonly http: HttpClient,
  ) {}

  async capture(el: HTMLElement, paperWidth: number): Promise<HTMLCanvasElement> {
    const targetPx = PAPER_PX[paperWidth] ?? PAPER_PX[80];
    const scale = (targetPx / el.offsetWidth) * 2;

    return html2canvas(el, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: false,
      logging: false,
    });
  }

  async print(ticketEl: HTMLElement, order?: Order | null): Promise<PrintResult> {
    const settings = await this.localSettings.get();

    if (settings.printerUrl.trim()) {
      try {
        if (!order) {
          throw new Error('No hay datos del pedido para generar ESC/POS.');
        }

        this.ensureSecurityConfigured();

        const hosts = this.resolveQzHosts(settings.printerUrl);
        await this.connectQz(hosts);

        const printer = await qz.printers.getDefault() as string;
        const config = qz.configs.create(printer);
        const rawTicket = this.buildEscPosTicket(order, settings.paperWidth);

        await qz.print(config, [{
          type: 'raw',
          format: 'command',
          flavor: 'plain',
          data: rawTicket,
        }]);

        return { success: true, method: 'qztray', message: `Impreso en "${printer}".` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[PrintService] QZ Tray fallo, descargando imagen:', msg);
      } finally {
        this.disconnectQz();
      }
    }

    const canvas = await this.capture(ticketEl, settings.paperWidth);
    this.downloadCanvas(canvas, order?.id);
    return { success: true, method: 'download', message: 'Imagen descargada para impresion.' };
  }

  private ensureSecurityConfigured(): void {
    if (this.securityConfigured) return;

    qz.security.setCertificatePromise(
      async () => this.fetchCertificate(),
      { rejectOnFailure: true },
    );

    qz.security.setSignatureAlgorithm('SHA512');
    qz.security.setSignaturePromise(async (toSign: string) => this.fetchSignature(toSign));

    this.securityConfigured = true;
  }

  private async fetchCertificate(): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<QzCertificateApi>>(this.qzCertificateUrl),
    );

    return response.data.certificate;
  }

  private async fetchSignature(payload: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<QzSignatureApi>>(this.qzSignUrl, payload, {
        headers: new HttpHeaders({ 'Content-Type': 'text/plain' }),
      }),
    );

    return response.data.signature;
  }

  private async connectQz(host: string[]): Promise<void> {
    if (qz.websocket.isActive()) return;

    await qz.websocket.connect({
      host,
      usingSecure: true,
      retries: 1,
      delay: 0,
    });
  }

  private disconnectQz(): void {
    if (qz.websocket.isActive()) {
      qz.websocket.disconnect().catch(() => { /* ignore */ });
    }
  }

  private resolveQzHosts(url: string): string[] {
    try {
      const hostname = new URL(url).hostname.toLowerCase();

      if (hostname === 'localhost') {
        return ['localhost', 'localhost.qz.io'];
      }

      if (['localhost.qz.io', '127.0.0.1', '::1'].includes(hostname)) {
        return [hostname];
      }
    } catch {
      // Fall through to localhost defaults.
    }

    return ['localhost', 'localhost.qz.io'];
  }

  private buildEscPosTicket(order: Order, paperWidth: number): string {
    const width = PAPER_CHARS[paperWidth] ?? PAPER_CHARS[80];
    const lines: string[] = [];

    lines.push(`${ESC}@`);
    lines.push(`${ESC}a${String.fromCharCode(1)}`);
    lines.push(`${GS}!${String.fromCharCode(0x11)}`);
    lines.push(`${this.sanitize('BOM ACAI')}\n`);
    lines.push(`${GS}!${String.fromCharCode(0)}`);
    lines.push(`${this.sanitize('Sistema de Pedidos')}\n`);
    lines.push(`${ESC}a${String.fromCharCode(0)}`);
    lines.push(`${this.separator('=', width)}\n`);
    lines.push(`${this.linePair(`Pedido #${this.formatOrderId(order.id)}`, this.formatDate(order.createdAt), width)}\n`);
    lines.push(`${this.linePair('', `${this.formatTime(order.createdAt)} hs`, width)}\n`);

    if (order.notes) {
      lines.push(`${this.separator('-', width)}\n`);
      for (const noteLine of this.wrapText(`Nota: ${order.notes}`, width)) {
        lines.push(`${noteLine}\n`);
      }
    }

    lines.push(`${this.separator('-', width)}\n`);

    for (const item of order.items) {
      const itemLabel = `x${item.quantity} ${item.presentationName}`;
      lines.push(`${this.linePair(itemLabel, this.formatPrice(item.subtotal), width)}\n`);

      for (const productLine of this.wrapText(item.productName, width - 2)) {
        lines.push(`  ${productLine}\n`);
      }

      for (const extra of item.extras) {
        const extraLabel = `+ ${extra.extraName}`;
        const wrappedExtra = this.wrapText(extraLabel, width - 2);

        for (const [index, extraLine] of wrappedExtra.entries()) {
          const left = `  ${extraLine}`;
          const right = index === 0 ? this.formatPrice(extra.unitPrice) : '';
          lines.push(`${this.linePair(left, right, width)}\n`);
        }
      }

      if (item.notes) {
        for (const itemNoteLine of this.wrapText(`Obs: ${item.notes}`, width - 2)) {
          lines.push(`  ${itemNoteLine}\n`);
        }
      }

      lines.push('\n');
    }

    lines.push(`${this.separator('=', width)}\n`);
    lines.push(`${ESC}E${String.fromCharCode(1)}`);
    lines.push(`${this.linePair('TOTAL', this.formatPrice(order.total), width)}\n`);
    lines.push(`${ESC}E${String.fromCharCode(0)}`);
    lines.push(`${this.separator('=', width)}\n`);
    lines.push(`${ESC}a${String.fromCharCode(1)}`);
    lines.push(`${this.sanitize('Gracias por su pedido!')}\n`);
    lines.push(`${ESC}a${String.fromCharCode(0)}`);
    lines.push('\n\n\n');
    lines.push(`${GS}V${String.fromCharCode(0)}`);

    return lines.join('');
  }

  private linePair(left: string, right: string, width: number): string {
    const leadingSpaces = left.match(/^ */)?.[0] ?? '';
    const normalizedLeft = `${leadingSpaces}${this.sanitize(left).replace(/^ +/, '')}`;
    const normalizedRight = this.sanitize(right);

    if (!normalizedRight) {
      return normalizedLeft.slice(0, width);
    }

    if (normalizedRight.length >= width) {
      return normalizedRight.slice(0, width);
    }

    const availableLeft = Math.max(0, width - normalizedRight.length - 1);
    const fittedLeft = normalizedLeft.length > availableLeft
      ? normalizedLeft.slice(0, availableLeft)
      : normalizedLeft;
    const padding = ' '.repeat(Math.max(1, width - fittedLeft.length - normalizedRight.length));

    return `${fittedLeft}${padding}${normalizedRight}`;
  }

  private wrapText(text: string, width: number): string[] {
    const normalized = this.sanitize(text);

    if (!normalized) {
      return [''];
    }

    const words = normalized.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if (!word) {
        continue;
      }

      if (word.length > width) {
        if (current) {
          lines.push(current);
          current = '';
        }

        for (let index = 0; index < word.length; index += width) {
          lines.push(word.slice(index, index + width));
        }

        continue;
      }

      const candidate = current ? `${current} ${word}` : word;

      if (candidate.length <= width) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines.length > 0 ? lines : [''];
  }

  private separator(char: string, width: number): string {
    return char.repeat(width);
  }

  private sanitize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatPrice(value: number): string {
    return `PYG ${Math.round(value).toLocaleString('es-PY')}`;
  }

  private formatOrderId(id: number): string {
    return String(id).padStart(7, '0');
  }

  private formatDate(dateStr: string | null): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatTime(dateStr: string | null): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-PY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private downloadCanvas(canvas: HTMLCanvasElement, orderId?: number): void {
    const link = document.createElement('a');
    const name = orderId !== undefined
      ? `pedido_${String(orderId).padStart(7, '0')}`
      : `pedido_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}`;
    link.download = `${name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}
