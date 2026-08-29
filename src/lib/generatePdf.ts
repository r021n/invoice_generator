import { jsPDF } from 'jspdf';
import type { InvoiceData } from './invoice';
import { calculateSubtotal, CURRENCIES, formatCurrency } from './invoice';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function generatePdf(invoice: InvoiceData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const currency = CURRENCIES.find((c) => c.code === invoice.currency) ?? CURRENCIES[0];

  function fmt(amount: number): string {
    return formatCurrency(amount, currency);
  }

  // Helper to add text and advance y
  const addText = (text: string, x: number, yPos: number, options?: { size?: number; style?: string; align?: string; maxWidth?: number }): number => {
    const size = options?.size || 10;
    const style = options?.style || 'normal';
    doc.setFontSize(size);
    doc.setFont('helvetica', style);

    if (options?.maxWidth) {
      const lines = doc.splitTextToSize(text, options.maxWidth);
      lines.forEach((line: string, i: number) => {
        doc.text(line, x, yPos + i * (size * 0.4));
      });
      return yPos + lines.length * (size * 0.4);
    }

    doc.text(text, x, yPos, { align: options?.align as 'left' | 'center' | 'right' });
    return yPos;
  };

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', margin, y + 8);
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text(invoice.invoiceNumber, margin, y + 4);
  y += 10;

  // Date info (right aligned)
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateText = `Date: ${formatDate(invoice.date)}`;
  const dueText = `Due: ${formatDate(invoice.dueDate)}`;
  doc.text(dateText, pageWidth - margin, margin + 4, { align: 'right' });
  doc.text(dueText, pageWidth - margin, margin + 9, { align: 'right' });

  // Horizontal rule
  y += 6;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // From / To sections
  const colWidth = contentWidth / 2;

  // From
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(128);
  doc.text('FROM', margin, y);
  y += 5;

  doc.setTextColor(0);
  doc.setFontSize(10);
  let fromY = y;
  if (invoice.from.name) {
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.from.name, margin, fromY);
    fromY += 5;
  }
  if (invoice.from.address) {
    doc.setFont('helvetica', 'normal');
    const addrLines = doc.splitTextToSize(invoice.from.address, colWidth - 5);
    addrLines.forEach((line: string, i: number) => {
      doc.text(line, margin, fromY + i * 4);
    });
    fromY += addrLines.length * 4 + 2;
  }
  if (invoice.from.email) {
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.from.email, margin, fromY);
    fromY += 5;
  }

  // To
  let toY = y - 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(128);
  doc.text('BILL TO', margin + colWidth, toY);
  toY += 5;

  doc.setTextColor(0);
  doc.setFontSize(10);
  if (invoice.to.name) {
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.to.name, margin + colWidth, toY);
    toY += 5;
  }
  if (invoice.to.address) {
    doc.setFont('helvetica', 'normal');
    const addrLines = doc.splitTextToSize(invoice.to.address, colWidth - 5);
    addrLines.forEach((line: string, i: number) => {
      doc.text(line, margin + colWidth, toY + i * 4);
    });
    toY += addrLines.length * 4 + 2;
  }
  if (invoice.to.email) {
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.to.email, margin + colWidth, toY);
    toY += 5;
  }

  y = Math.max(fromY, toY) + 10;

  // Items table header
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y - 4, contentWidth, 8, 'F');
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', margin + 3, y + 1);
  doc.text('QTY', margin + colWidth * 0.65, y + 1, { align: 'right' });
  doc.text('PRICE', margin + colWidth * 0.82, y + 1, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin - 3, y + 1, { align: 'right' });
  y += 10;

  // Items
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  for (const item of invoice.items) {
    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = margin;
    }

    const desc = item.description || 'Untitled item';
    const descLines = doc.splitTextToSize(desc, colWidth * 0.6);
    const lineHeight = 5;

    // Description
    doc.text(descLines, margin + 3, y + 3);

    // Qty, Price, Total
    doc.text(String(item.quantity), margin + colWidth * 0.65, y + 3, { align: 'right' });
    doc.text(fmt(item.price), margin + colWidth * 0.82, y + 3, { align: 'right' });
    doc.text(fmt(item.quantity * item.price), pageWidth - margin - 3, y + 3, { align: 'right' });

    y += Math.max(descLines.length, 1) * lineHeight + 3;

    // Subtle separator
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
  }

  y += 5;

  // Total section
  const totalBoxWidth = 70;
  const totalBoxX = pageWidth - margin - totalBoxWidth;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', totalBoxX, y);
  doc.text(fmt(calculateSubtotal(invoice.items)), pageWidth - margin - 3, y, { align: 'right' });
  y += 7;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(totalBoxX, y - 2, pageWidth - margin, y - 2);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', totalBoxX, y + 5);
  doc.text(fmt(calculateSubtotal(invoice.items)), pageWidth - margin - 3, y + 5, { align: 'right' });
  y += 15;

  // Notes
  if (invoice.notes) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(128);
    doc.text('NOTES', margin, y);
    y += 5;

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(invoice.notes, contentWidth);
    noteLines.forEach((line: string, i: number) => {
      doc.text(line, margin, y + i * 4);
    });
  }

  // Save
  doc.save(`${invoice.invoiceNumber || 'invoice'}.pdf`);
}
