<script lang="ts">
  import type { InvoiceData, InvoiceColumn, InvoiceItem } from './invoice';
  import { calculateSubtotal, calculateItemTotal } from './invoice';
  import { formatCurrencyAmount, formatDateIndonesian } from './formatters';

  interface Props {
    invoice: InvoiceData;
  }

  let { invoice }: Props = $props();

  let subtotal = $derived(calculateSubtotal(invoice.items, invoice.columns));

  function formatCellValue(item: InvoiceItem, col: InvoiceColumn): string {
    const rawVal = item.values[col.id];
    if (col.type === 'total') {
      return formatCurrencyAmount(calculateItemTotal(item, invoice.columns), invoice.currency);
    }
    if (col.type === 'currency') {
      return formatCurrencyAmount(Number(rawVal || 0), invoice.currency);
    }
    if (col.type === 'number') {
      return rawVal !== undefined && rawVal !== '' ? String(rawVal) : '0';
    }
    return String(rawVal ?? '');
  }
</script>

<div
  id="invoice-preview"
  class="mx-auto max-w-[800px] bg-white p-8 text-zinc-900 shadow-md sm:p-12 border border-zinc-200 rounded-sm"
>
  <!-- Header Faktur -->
  <div class="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
    <div>
      <h1 class="text-3xl font-extrabold tracking-tight text-zinc-900">FAKTUR</h1>
      <p class="mt-1 font-mono text-sm text-zinc-600">{invoice.invoiceNumber || 'INV-0000'}</p>
    </div>
    <div class="space-y-1 text-sm sm:text-right">
      <p><span class="text-zinc-600">Tanggal:</span> <span class="font-medium text-zinc-900">{formatDateIndonesian(invoice.date)}</span></p>
      <p><span class="text-zinc-600">Jatuh Tempo:</span> <span class="font-medium text-zinc-900">{formatDateIndonesian(invoice.dueDate)}</span></p>
    </div>
  </div>

  <hr class="mb-8 border-zinc-900" />

  <!-- Pengirim & Penerima -->
  <div class="mb-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
    <div>
      <p class="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Dari</p>
      {#if invoice.from.name}
        <p class="font-semibold text-zinc-900">{invoice.from.name}</p>
      {/if}
      {#if invoice.from.address}
        <p class="whitespace-pre-line text-sm text-zinc-700 mt-1">{invoice.from.address}</p>
      {/if}
      {#if invoice.from.email}
        <p class="text-sm text-zinc-700 mt-1">{invoice.from.email}</p>
      {/if}
      {#if !invoice.from.name && !invoice.from.address && !invoice.from.email}
        <p class="text-sm italic text-zinc-500">Belum diisi</p>
      {/if}
    </div>
    <div>
      <p class="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Ditujukan Kepada</p>
      {#if invoice.to.name}
        <p class="font-semibold text-zinc-900">{invoice.to.name}</p>
      {/if}
      {#if invoice.to.address}
        <p class="whitespace-pre-line text-sm text-zinc-700 mt-1">{invoice.to.address}</p>
      {/if}
      {#if invoice.to.email}
        <p class="text-sm text-zinc-700 mt-1">{invoice.to.email}</p>
      {/if}
      {#if !invoice.to.name && !invoice.to.address && !invoice.to.email}
        <p class="text-sm italic text-zinc-500">Belum diisi</p>
      {/if}
    </div>
  </div>

  <!-- Tabel Item -->
  <div class="mb-8 overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b-2 border-zinc-900 text-xs font-bold uppercase tracking-wider text-zinc-800">
          {#each invoice.columns as col (col.id)}
            <th class="py-3 px-2 {col.type === 'number' || col.type === 'currency' || col.type === 'total' ? 'text-right' : 'text-left'}">
              {col.label}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-zinc-200">
        {#each invoice.items as item (item.id)}
          <tr>
            {#each invoice.columns as col (col.id)}
              <td
                class="py-3 px-2 {col.type === 'number' || col.type === 'currency' || col.type === 'total'
                  ? 'text-right tabular-nums font-mono text-xs'
                  : 'text-left'}"
              >
                {#if col.type === 'total'}
                  <span class="font-semibold text-zinc-900">
                    {formatCellValue(item, col)}
                  </span>
                {:else if col.type === 'currency'}
                  <span class="text-zinc-800">
                    {formatCellValue(item, col)}
                  </span>
                {:else}
                  <span class="text-zinc-800">
                    {formatCellValue(item, col) || '-'}
                  </span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Total Summary -->
  <div class="flex justify-end">
    <div class="w-full max-w-[280px]">
      <div class="flex items-center justify-between border-b border-zinc-200 py-2 text-sm">
        <span class="text-zinc-600">Subtotal</span>
        <span class="font-mono tabular-nums text-zinc-900">{formatCurrencyAmount(subtotal, invoice.currency)}</span>
      </div>
      <div class="flex items-center justify-between border-b-2 border-zinc-900 py-3">
        <span class="text-base font-bold text-zinc-900">Total</span>
        <span class="font-mono text-lg font-bold text-zinc-900 tabular-nums">{formatCurrencyAmount(subtotal, invoice.currency)}</span>
      </div>
    </div>
  </div>

  <!-- Catatan -->
  {#if invoice.notes}
    <div class="mt-8 border-t border-zinc-200 pt-5">
      <p class="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-500">Catatan & Ketentuan</p>
      <p class="whitespace-pre-line text-xs text-zinc-700 leading-relaxed">{invoice.notes}</p>
    </div>
  {/if}
</div>
