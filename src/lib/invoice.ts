export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', locale: 'id-ID' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'sg-SG' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', locale: 'th-TH' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
];

export function formatCurrency(amount: number, currency: Currency): string {
  const formatted = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: currency.code === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency.code === 'JPY' ? 0 : 2,
  }).format(amount);
  return `${currency.symbol} ${formatted}`;
}

export type ColumnType = 'text' | 'number' | 'currency' | 'total';

export interface InvoiceColumn {
  id: string;
  label: string;
  type: ColumnType;
  isRemovable?: boolean;
}

export interface InvoiceItem {
  id: string;
  values: Record<string, string | number>;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  currency: string;
  from: {
    name: string;
    address: string;
    email: string;
  };
  to: {
    name: string;
    address: string;
    email: string;
  };
  columns: InvoiceColumn[];
  items: InvoiceItem[];
  notes: string;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const DEFAULT_COLUMN_IDS = {
  DESCRIPTION: 'col_desc',
  QUANTITY: 'col_qty',
  PRICE: 'col_price',
  TOTAL: 'col_total',
};

export function getDefaultColumns(): InvoiceColumn[] {
  return [
    { id: DEFAULT_COLUMN_IDS.DESCRIPTION, label: 'Description', type: 'text', isRemovable: false },
    { id: DEFAULT_COLUMN_IDS.QUANTITY, label: 'Qty', type: 'number', isRemovable: true },
    { id: DEFAULT_COLUMN_IDS.PRICE, label: 'Price', type: 'currency', isRemovable: true },
    { id: DEFAULT_COLUMN_IDS.TOTAL, label: 'Total', type: 'total', isRemovable: false },
  ];
}

export function calculateItemTotal(item: InvoiceItem, columns: InvoiceColumn[]): number {
  const qtyCol = columns.find((c) => c.id === DEFAULT_COLUMN_IDS.QUANTITY || c.type === 'number');
  const priceCol = columns.find((c) => c.id === DEFAULT_COLUMN_IDS.PRICE || c.type === 'currency');

  const qty = qtyCol ? Number(item.values[qtyCol.id] || 0) : 1;
  const price = priceCol ? Number(item.values[priceCol.id] || 0) : 0;

  return qty * price;
}

export function calculateSubtotal(items: InvoiceItem[], columns: InvoiceColumn[]): number {
  return items.reduce((sum, item) => sum + calculateItemTotal(item, columns), 0);
}

export function createEmptyInvoice(): InvoiceData {
  const defaultCols = getDefaultColumns();
  return {
    invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'IDR',
    from: { name: '', address: '', email: '' },
    to: { name: '', address: '', email: '' },
    columns: defaultCols,
    items: [
      {
        id: generateId(),
        values: {
          [DEFAULT_COLUMN_IDS.DESCRIPTION]: '',
          [DEFAULT_COLUMN_IDS.QUANTITY]: 1,
          [DEFAULT_COLUMN_IDS.PRICE]: 0,
        },
      },
    ],
    notes: '',
  };
}
