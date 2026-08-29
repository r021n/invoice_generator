<script lang="ts">
  import type { InvoiceData } from './invoice';
  import { calculateSubtotal, CURRENCIES, formatCurrency } from './invoice';

  let { invoice }: { invoice: InvoiceData } = $props();

  let subtotal = $derived(calculateSubtotal(invoice.items));
  let currency = $derived(CURRENCIES.find((c) => c.code === invoice.currency) ?? CURRENCIES[0]);

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function fmt(amount: number): string {
    return formatCurrency(amount, currency);
  }
</script>

<div id="invoice-preview" class="mx-auto max-w-[800px] bg-white p-8 text-black shadow-lg sm:p-12">
  <!-- Header -->
  <div class="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">INVOICE</h1>
      <p class="mt-1 text-sm text-zinc-500">{invoice.invoiceNumber}</p>
    </div>
    <div class="text-right text-sm">
      <p><span class="text-zinc-500">Date:</span> {formatDate(invoice.date)}</p>
      <p><span class="text-zinc-500">Due:</span> {formatDate(invoice.dueDate)}</p>
    </div>
  </div>

  <hr class="mb-10 border-black" />

  <!-- From / To -->
  <div class="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
    <div>
      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">From</p>
      {#if invoice.from.name}
        <p class="font-semibold">{invoice.from.name}</p>
      {/if}
      {#if invoice.from.address}
        <p class="whitespace-pre-line text-sm text-zinc-600">{invoice.from.address}</p>
      {/if}
      {#if invoice.from.email}
        <p class="text-sm text-zinc-600">{invoice.from.email}</p>
      {/if}
      {#if !invoice.from.name && !invoice.from.address && !invoice.from.email}
        <p class="text-sm italic text-zinc-400">Not provided</p>
      {/if}
    </div>
    <div>
      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Bill to</p>
      {#if invoice.to.name}
        <p class="font-semibold">{invoice.to.name}</p>
      {/if}
      {#if invoice.to.address}
        <p class="whitespace-pre-line text-sm text-zinc-600">{invoice.to.address}</p>
      {/if}
      {#if invoice.to.email}
        <p class="text-sm text-zinc-600">{invoice.to.email}</p>
      {/if}
      {#if !invoice.to.name && !invoice.to.address && !invoice.to.email}
        <p class="text-sm italic text-zinc-400">Not provided</p>
      {/if}
    </div>
  </div>

  <!-- Items Table -->
  <div class="mb-10">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-black">
          <th class="py-3 text-left font-semibold">Description</th>
          <th class="hidden py-3 text-right font-semibold sm:table-cell">Qty</th>
          <th class="hidden py-3 text-right font-semibold sm:table-cell">Price</th>
          <th class="py-3 text-right font-semibold">Total</th>
        </tr>
      </thead>
      <tbody>
        {#each invoice.items as item}
          <tr class="border-b border-zinc-200">
            <td class="py-3">
              {item.description || 'Untitled item'}
              <span class="text-xs text-zinc-400 sm:hidden"> ({item.quantity} x {fmt(item.price)})</span>
            </td>
            <td class="hidden py-3 text-right tabular-nums sm:table-cell">{item.quantity}</td>
            <td class="hidden py-3 text-right tabular-nums sm:table-cell">{fmt(item.price)}</td>
            <td class="py-3 text-right font-medium tabular-nums">{fmt(item.quantity * item.price)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Total -->
  <div class="flex justify-end">
    <div class="w-full max-w-[240px]">
      <div class="flex items-center justify-between border-b border-zinc-200 py-2">
        <span class="text-sm text-zinc-500">Subtotal</span>
        <span class="tabular-nums">{fmt(subtotal)}</span>
      </div>
      <div class="flex items-center justify-between border-b border-black py-2">
        <span class="text-base font-bold">Total</span>
        <span class="text-lg font-bold tabular-nums">{fmt(subtotal)}</span>
      </div>
    </div>
  </div>

  <!-- Notes -->
  {#if invoice.notes}
    <div class="mt-10 border-t border-zinc-200 pt-6">
      <p class="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Notes</p>
      <p class="whitespace-pre-line text-sm text-zinc-600">{invoice.notes}</p>
    </div>
  {/if}
</div>
