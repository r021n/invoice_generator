import { jsPDF } from 'jspdf';
import type { InvoiceData, InvoiceColumn, InvoiceItem } from './invoice';
import {
  calculateSubtotal,
  calculateItemTotal,
  CURRENCIES,
  formatCurrency,
} from './invoice';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function generatePdf(invoice: InvoiceData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const currency =
    CURRENCIES.find((c) => c.code === invoice.currency) ?? CURRENCIES[0];

  function fmt(amount: number): string {
    return formatCurrency(amount, currency);
  }

  function formatCellValue(item: InvoiceItem, col: InvoiceColumn): string {
    const rawVal = item.values[col.id];
    if (col.type === 'total') {
      return fmt(calculateItemTotal(item, invoice.columns));
    }
    if (col.type === 'currency') {
      return fmt(Number(rawVal || 0));
    }
    if (col.type === 'number') {
      return rawVal !== undefined && rawVal !== '' ? String(rawVal) : '0';
    }
    return String(rawVal ?? '');
  }

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('INVOICE', margin, y + 6);
  y += 9;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(invoice.invoiceNumber || 'INV-0000', margin, y + 2);

  // Date info (right aligned)
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  const dateText = `Tanggal: ${formatDate(invoice.date)}`;
  const dueText = `Jatuh Tempo: ${formatDate(invoice.dueDate)}`;
  doc.text(dateText, pageWidth - margin, margin + 4, { align: 'right' });
  doc.text(dueText, pageWidth - margin, margin + 9, { align: 'right' });

  // Divider
  y += 8;
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // From / To sections
  const halfColWidth = (contentWidth - 10) / 2;

  // From
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 120, 120);
  doc.text('DARI (FROM)', margin, y);

  // To
  doc.text('DITUJUKAN KEPADA (BILL TO)', margin + halfColWidth + 10, y);
  y += 5;

  let fromY = y;
  doc.setTextColor(20, 20, 20);
  if (invoice.from.name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(invoice.from.name, margin, fromY);
    fromY += 5;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (invoice.from.address) {
    const addrLines = doc.splitTextToSize(invoice.from.address, halfColWidth);
    doc.text(addrLines, margin, fromY);
    fromY += addrLines.length * 4.2;
  }
  if (invoice.from.email) {
    doc.text(invoice.from.email, margin, fromY);
    fromY += 5;
  }

  let toY = y;
  if (invoice.to.name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(invoice.to.name, margin + halfColWidth + 10, toY);
    toY += 5;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (invoice.to.address) {
    const addrLines = doc.splitTextToSize(invoice.to.address, halfColWidth);
    doc.text(addrLines, margin + halfColWidth + 10, toY);
    toY += addrLines.length * 4.2;
  }
  if (invoice.to.email) {
    doc.text(invoice.to.email, margin + halfColWidth + 10, toY);
    toY += 5;
  }

  y = Math.max(fromY, toY, y + 15) + 6;

  // Calculate dynamic column widths based on weights
  const columns = invoice.columns;
  const colWeights = columns.map((col, idx) => {
    if (col.type === 'text') return idx === 0 ? 3.2 : 1.6;
    if (col.type === 'number') return 1.1;
    if (col.type === 'currency') return 1.8;
    if (col.type === 'total') return 1.8;
    return 1.5;
  });
  const totalWeight = colWeights.reduce((a, b) => a + b, 0);
  const colWidths = colWeights.map((w) => (w / totalWeight) * contentWidth);

  // Helper to compute column X start
  const getColX = (colIdx: number) => {
    let x = margin;
    for (let i = 0; i < colIdx; i++) {
      x += colWidths[i];
    }
    return x;
  };

  // Draw Table Header
  const headerHeight = 7;
  doc.setFillColor(24, 24, 27);
  doc.rect(margin, y - 4, contentWidth, headerHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  columns.forEach((col, idx) => {
    const colX = getColX(idx);
    const w = colWidths[idx];
    const isRightAlign =
      col.type === 'number' || col.type === 'currency' || col.type === 'total';
    if (isRightAlign) {
      doc.text(col.label.toUpperCase(), colX + w - 2, y + 1, { align: 'right' });
    } else {
      doc.text(col.label.toUpperCase(), colX + 2, y + 1);
    }
  });

  y += 7;

  // Draw Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);

  for (const item of invoice.items) {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = margin;
    }

    // Calculate maximum line height needed for this row
    let maxLines = 1;
    const splitTexts: Record<string, string[]> = {};

    columns.forEach((col, idx) => {
      const val = formatCellValue(item, col) || '-';
      const w = colWidths[idx] - 4;
      const lines = doc.splitTextToSize(val, Math.max(w, 10));
      splitTexts[col.id] = lines;
      if (lines.length > maxLines) {
        maxLines = lines.length;
      }
    });

    const rowHeight = Math.max(maxLines * 4.5 + 3, 7);

    // Print cell contents
    columns.forEach((col, idx) => {
      const colX = getColX(idx);
      const w = colWidths[idx];
      const isRightAlign =
        col.type === 'number' || col.type === 'currency' || col.type === 'total';
      const lines = splitTexts[col.id] || [];

      if (col.type === 'total') {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      if (isRightAlign) {
        doc.text(lines, colX + w - 2, y + 2, { align: 'right' });
      } else {
        doc.text(lines, colX + 2, y + 2);
      }
    });

    y += rowHeight;

    // Row bottom separator line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 1, pageWidth - margin, y - 1);
  }

  y += 4;

  // Subtotal & Total
  const totalSubtotal = calculateSubtotal(invoice.items, invoice.columns);
  const totalBoxWidth = Math.min(80, contentWidth * 0.45);
  const totalBoxX = pageWidth - margin - totalBoxWidth;

  if (y > pageHeight - 45) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal', totalBoxX, y);
  doc.setTextColor(30, 30, 30);
  doc.text(fmt(totalSubtotal), pageWidth - margin - 2, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.5);
  doc.line(totalBoxX, y - 1, pageWidth - margin, y - 1);
  y += 4;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Total', totalBoxX, y + 1);
  doc.text(fmt(totalSubtotal), pageWidth - margin - 2, y + 1, { align: 'right' });
  y += 12;

  // Notes section
  if (invoice.notes) {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = margin;
    }

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
    y += 4;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text('CATATAN (NOTES)', margin, y);
    y += 4;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(noteLines, margin, y);
  }

  // Save
  doc.save(`${invoice.invoiceNumber || 'invoice'}.pdf`);
}
