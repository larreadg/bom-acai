import { Injectable } from '@angular/core';
import ExcelJS from 'exceljs';

import { Order, OrderSummary } from '../models/order.model';

const PURPLE      = '5B21B6';
const PURPLE_LIGHT = 'EDE9FE';
const GREY        = 'F3F4F6';
const RED_BG      = 'FEE2E2';
const RED_FG      = 'B91C1C';
const WHITE       = 'FFFFFF';

@Injectable({ providedIn: 'root' })
export class ReportService {

  async downloadOrdersReport(
    orders: Order[],
    summary: OrderSummary,
    periodLabel: string,
  ): Promise<void> {
    // Pre-compute per-order cost/profit
    for (const order of orders) {
      (order as any)._cost = order.items.reduce(
        (sum, item) => sum + this.getItemCost(item),
        0
      );
      (order as any)._profit = order.status !== 'cancelled' ? order.total - (order as any)._cost : 0;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'Bom Acaí POS';
    wb.created  = new Date();

    this.buildSummarySheet(wb, summary, periodLabel);
    this.buildOrdersSheet(wb, orders);
    this.buildDetailSheet(wb, orders);

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const date     = new Date().toISOString().slice(0, 10);
    const filename = `reporte_pedidos_${date}.xlsx`;

    const link  = document.createElement('a');
    link.href   = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // ── Hoja 1: Resumen ────────────────────────────────────────────────────────
  private buildSummarySheet(wb: ExcelJS.Workbook, summary: OrderSummary, periodLabel: string): void {
    const ws = wb.addWorksheet('Resumen');
    ws.columns = [
      { width: 28 },
      { width: 22 },
    ];

    // Logo / título
    const titleRow = ws.addRow(['BOM ACAÍ — Reporte de Pedidos', '']);
    titleRow.height = 28;
    titleRow.getCell(1).font   = { bold: true, size: 16, color: { argb: 'FF' + PURPLE } };
    titleRow.getCell(1).alignment = { vertical: 'middle' };
    ws.mergeCells(`A1:B1`);

    const periodRow = ws.addRow([`Período: ${periodLabel}`, '']);
    periodRow.getCell(1).font = { italic: true, color: { argb: 'FF555555' } };
    ws.mergeCells('A2:B2');

    ws.addRow([]);

    // Cards de resumen
    const headers = ws.addRow(['Métrica', 'Valor']);
    headers.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + PURPLE } };
      cell.font = { bold: true, color: { argb: 'FF' + WHITE } };
      cell.alignment = { horizontal: 'center' };
      cell.border = this.thinBorder();
    });

    const dataRows: [string, string | number][] = [
      ['Total de pedidos',   summary.totalOrders],
      ['Facturación',        this.formatPrice(summary.totalAmount)],
      ['Costo total',        this.formatPrice(summary.totalCost)],
      ['Ganancia',           this.formatPrice(summary.totalProfit)],
      ['Pedidos cancelados', summary.cancelledOrders],
    ];

    dataRows.forEach(([label, value], i) => {
      const row = ws.addRow([label, value]);
      const bg  = i % 2 === 0 ? GREY : WHITE;
      row.eachCell(cell => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
        cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center' };
        cell.border    = this.thinBorder();
      });
      row.getCell(2).font = { bold: true };
    });
  }

  // ── Hoja 2: Pedidos ───────────────────────────────────────────────────────
  private buildOrdersSheet(wb: ExcelJS.Workbook, orders: Order[]): void {
    const ws = wb.addWorksheet('Pedidos');

    ws.columns = [
      { key: 'orderId', header: 'Nro Pedido', width: 14 },
      { key: 'date',    header: 'Fecha',       width: 13 },
      { key: 'time',    header: 'Hora',        width: 10 },
      { key: 'status',  header: 'Estado',      width: 14 },
      { key: 'notes',   header: 'Nota',        width: 24 },
      { key: 'items',   header: 'Cant. items', width: 13 },
      { key: 'total',   header: 'Facturación', width: 14 },
      { key: 'cost',    header: 'Costo',       width: 14 },
      { key: 'profit',  header: 'Ganancia',    width: 14 },
    ];

    // Header
    const headerRow = ws.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell(cell => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + PURPLE } };
      cell.font      = { bold: true, color: { argb: 'FF' + WHITE }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = this.thinBorder();
    });

    // Data
    orders.forEach((order, i) => {
      const { date, time } = this.formatDateTime(order.createdAt);
      const isCancelled    = order.status === 'cancelled';
      const bg             = isCancelled ? RED_BG : (i % 2 === 0 ? GREY : WHITE);
      const fg             = isCancelled ? RED_FG : '000000';

      const orderCost   = (order as any)._cost   ?? 0;
      const orderProfit = (order as any)._profit ?? 0;

      const row = ws.addRow({
        orderId: `#${this.formatOrderId(order.id)}`,
        date,
        time,
        status:  this.statusLabel(order.status),
        notes:   order.notes ?? '',
        items:   order.items.reduce((sum, it) => sum + it.quantity, 0),
        total:   isCancelled ? '' : order.total,
        cost:    isCancelled ? '' : orderCost,
        profit:  isCancelled ? '' : orderProfit,
      });

      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
        cell.font   = { color: { argb: 'FF' + fg } };
        cell.border = this.thinBorder();
        cell.alignment = { vertical: 'middle' };
      });

      // Columnas numéricas: Total (7), Costo (8), Ganancia (9)
      [7, 8, 9].forEach(col => {
        const cell = row.getCell(col);
        if (cell.value !== '' && cell.value !== null) {
          cell.numFmt    = '#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
    });

    ws.views      = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: 'I1' };
  }

  // ── Hoja 3: Detalle ────────────────────────────────────────────────────────
  private buildDetailSheet(wb: ExcelJS.Workbook, orders: Order[]): void {
    const ws = wb.addWorksheet('Detalle');

    ws.columns = [
      { key: 'orderId',      header: 'Pedido',        width: 12 },
      { key: 'date',         header: 'Fecha',         width: 13 },
      { key: 'time',         header: 'Hora',          width: 10 },
      { key: 'status',       header: 'Estado',        width: 14 },
      { key: 'orderNotes',   header: 'Nota pedido',   width: 20 },
      { key: 'presentation', header: 'Presentación',  width: 24 },
      { key: 'product',      header: 'Producto',      width: 22 },
      { key: 'qty',          header: 'Cant.',         width: 8  },
      { key: 'unitPrice',    header: 'Precio unit.',  width: 14 },
      { key: 'extras',       header: 'Extras',        width: 30 },
      { key: 'extrasTotal',  header: 'Total extras',  width: 14 },
      { key: 'subtotal',     header: 'Subtotal',      width: 14 },
      { key: 'orderTotal',   header: 'Total pedido',  width: 14 },
    ];

    // Header row
    const headerRow = ws.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell(cell => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + PURPLE } };
      cell.font      = { bold: true, color: { argb: 'FF' + WHITE }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = this.thinBorder();
    });

    // Data rows
    let rowIndex = 2;

    for (const order of orders) {
      const isCancelled = order.status === 'cancelled';
      const { date, time } = this.formatDateTime(order.createdAt);
      const statusLabel    = this.statusLabel(order.status);
      const isFirstItem    = true;

      if (order.items.length === 0) {
        // Pedido sin items (edge case)
        const row = ws.addRow({
          orderId:      `#${this.formatOrderId(order.id)}`,
          date,
          time,
          status:       statusLabel,
          orderNotes:   order.notes ?? '',
          presentation: '',
          product:      '',
          qty:          '',
          unitPrice:    '',
          extras:       '',
          extrasTotal:  '',
          subtotal:     '',
          orderTotal:   order.total,
        });
        this.styleDataRow(row, isCancelled, true, ws);
        rowIndex++;
        continue;
      }

      order.items.forEach((item, itemIndex) => {
        const extrasStr   = item.extras.map(e => e.extraName).join(', ');
        const extrasTotal = item.extras.reduce((s, e) => s + e.unitPrice, 0) * item.quantity;
        const isFirst     = itemIndex === 0;

        const row = ws.addRow({
          orderId:      isFirst ? `#${this.formatOrderId(order.id)}` : '',
          date:         isFirst ? date : '',
          time:         isFirst ? time : '',
          status:       isFirst ? statusLabel : '',
          orderNotes:   isFirst ? (order.notes ?? '') : '',
          presentation: item.presentationName,
          product:      item.productName,
          qty:          item.quantity,
          unitPrice:    item.unitPrice,
          extras:       extrasStr,
          extrasTotal:  extrasTotal > 0 ? extrasTotal : '',
          subtotal:     item.subtotal,
          orderTotal:   isFirst ? order.total : '',
        });

        this.styleDataRow(row, isCancelled, isFirst, ws);
        rowIndex++;
      });
    }

    // Freeze header
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    // Auto-filter
    ws.autoFilter = { from: 'A1', to: 'M1' };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private styleDataRow(row: ExcelJS.Row, cancelled: boolean, isOrderStart: boolean, ws: ExcelJS.Worksheet): void {
    row.eachCell({ includeEmpty: true }, cell => {
      if (cancelled) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + RED_BG } };
        cell.font = { color: { argb: 'FF' + RED_FG } };
      } else if (isOrderStart) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + PURPLE_LIGHT } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      }
      cell.border    = this.thinBorder();
      cell.alignment = { vertical: 'middle', wrapText: false };
    });

    // Number format for price columns (I, K, L, M = cols 9, 11, 12, 13)
    [9, 11, 12, 13].forEach(colNum => {
      const cell = row.getCell(colNum);
      if (cell.value !== '' && cell.value !== null && cell.value !== undefined) {
        cell.numFmt    = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });

    // Qty column (H = 8) right-align
    row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  private thinBorder(): Partial<ExcelJS.Borders> {
    const side = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } };
    return { top: side, left: side, bottom: side, right: side };
  }

  private formatOrderId(id: number): string {
    return String(id).padStart(7, '0');
  }

  private getItemCost(item: Order['items'][number]): number {
    const extrasCost = item.extras.reduce((sum, extra) => sum + extra.unitCost, 0);
    return (item.unitCost + extrasCost) * item.quantity;
  }

  private formatPrice(value: number): string {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(value);
  }

  private formatDateTime(dateStr: string | null): { date: string; time: string } {
    if (!dateStr) return { date: '', time: '' };
    const d = new Date(dateStr);
    const p = (n: number) => String(n).padStart(2, '0');
    return {
      date: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`,
      time: `${p(d.getHours())}:${p(d.getMinutes())}`,
    };
  }

  private statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending:   'Pendiente',
      preparing: 'En preparación',
      ready:     'Listo',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return labels[status] ?? status;
  }
}
