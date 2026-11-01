import { CURRENCIES, type Currency } from './invoice';

export function getCurrency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function formatCurrencyAmount(amount: number, currency: Currency | string): string {
  const currObj = typeof currency === 'string' ? getCurrency(currency) : currency;
  const num = Number(amount) || 0;
  const isFractional = currObj.code !== 'JPY';

  const formatted = new Intl.NumberFormat(currObj.locale, {
    minimumFractionDigits: isFractional ? 2 : 0,
    maximumFractionDigits: isFractional ? 2 : 0,
  }).format(num);

  return `${currObj.symbol} ${formatted}`;
}

export function formatDateIndonesian(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatRelativeOrDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
