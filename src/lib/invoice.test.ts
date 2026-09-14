import { describe, it, expect } from 'vitest';
import {
  calculateItemTotal,
  calculateSubtotal,
  createEmptyInvoice,
  formatCurrency,
  CURRENCIES,
  DEFAULT_COLUMN_IDS,
  type InvoiceColumn,
  type InvoiceItem,
} from './invoice';

describe('Invoice utility unit tests', () => {
  it('should create an empty invoice with valid default properties', () => {
    const invoice = createEmptyInvoice();

    expect(invoice.invoiceNumber).toMatch(/^INV-/);
    expect(invoice.currency).toBe('IDR');
    expect(invoice.items.length).toBe(1);
    expect(invoice.columns.length).toBe(4);
    expect(invoice.from).toEqual({ name: '', address: '', email: '' });
    expect(invoice.to).toEqual({ name: '', address: '', email: '' });
  });

  it('should calculate single item total correctly', () => {
    const columns: InvoiceColumn[] = [
      { id: DEFAULT_COLUMN_IDS.DESCRIPTION, label: 'Desc', type: 'text' },
      { id: DEFAULT_COLUMN_IDS.QUANTITY, label: 'Qty', type: 'number' },
      { id: DEFAULT_COLUMN_IDS.PRICE, label: 'Price', type: 'currency' },
      { id: DEFAULT_COLUMN_IDS.TOTAL, label: 'Total', type: 'total' },
    ];

    const item: InvoiceItem = {
      id: '1',
      values: {
        [DEFAULT_COLUMN_IDS.DESCRIPTION]: 'Web Development',
        [DEFAULT_COLUMN_IDS.QUANTITY]: 5,
        [DEFAULT_COLUMN_IDS.PRICE]: 200000,
      },
    };

    const total = calculateItemTotal(item, columns);
    expect(total).toBe(1000000);
  });

  it('should calculate subtotal correctly across multiple items', () => {
    const columns: InvoiceColumn[] = [
      { id: DEFAULT_COLUMN_IDS.DESCRIPTION, label: 'Desc', type: 'text' },
      { id: DEFAULT_COLUMN_IDS.QUANTITY, label: 'Qty', type: 'number' },
      { id: DEFAULT_COLUMN_IDS.PRICE, label: 'Price', type: 'currency' },
      { id: DEFAULT_COLUMN_IDS.TOTAL, label: 'Total', type: 'total' },
    ];

    const items: InvoiceItem[] = [
      {
        id: '1',
        values: {
          [DEFAULT_COLUMN_IDS.QUANTITY]: 2,
          [DEFAULT_COLUMN_IDS.PRICE]: 50000,
        },
      },
      {
        id: '2',
        values: {
          [DEFAULT_COLUMN_IDS.QUANTITY]: 3,
          [DEFAULT_COLUMN_IDS.PRICE]: 100000,
        },
      },
    ];

    const subtotal = calculateSubtotal(items, columns);
    expect(subtotal).toBe(400000);
  });

  it('should format currency with proper symbol and formatting', () => {
    const idrCurrency = CURRENCIES.find((c) => c.code === 'IDR')!;
    const formatted = formatCurrency(500000, idrCurrency);
    expect(formatted).toContain('Rp');
    expect(formatted).toContain('500');

    const usdCurrency = CURRENCIES.find((c) => c.code === 'USD')!;
    const formattedUsd = formatCurrency(150.5, usdCurrency);
    expect(formattedUsd).toContain('$');
    expect(formattedUsd).toContain('150.50');
  });
});
