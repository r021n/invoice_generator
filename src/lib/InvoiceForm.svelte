<script lang="ts">
  import type { InvoiceData, InvoiceItem } from './invoice';
  import { generateId, CURRENCIES } from './invoice';

  let { invoice = $bindable() }: { invoice: InvoiceData } = $props();

  let selectedCurrency = $derived(CURRENCIES.find((c) => c.code === invoice.currency) ?? CURRENCIES[0]);

  function addItem() {
    invoice.items = [...invoice.items, { id: generateId(), description: '', quantity: 1, price: 0 }];
  }

  function removeItem(id: string) {
    if (invoice.items.length > 1) {
      invoice.items = invoice.items.filter((item) => item.id !== id);
    }
  }

  function updateItem(id: string, field: keyof InvoiceItem, value: string | number) {
    invoice.items = invoice.items.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
  }
</script>

<div class="space-y-8">
  <!-- Invoice Details -->
  <section class="space-y-4">
    <h2 class="text-sm font-semibold uppercase tracking-wider text-zinc-500">Invoice details</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div>
        <label for="invoiceNumber" class="mb-1 block text-xs text-zinc-500">Invoice number</label>
        <input
          id="invoiceNumber"
          type="text"
          bind:value={invoice.invoiceNumber}
          class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
      </div>
      <div>
        <label for="currency" class="mb-1 block text-xs text-zinc-500">Currency</label>
        <select
          id="currency"
          bind:value={invoice.currency}
          class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        >
          {#each CURRENCIES as currency}
            <option value={currency.code}>{currency.symbol} - {currency.name}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="date" class="mb-1 block text-xs text-zinc-500">Date</label>
        <input
          id="date"
          type="date"
          bind:value={invoice.date}
          class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
      </div>
      <div>
        <label for="dueDate" class="mb-1 block text-xs text-zinc-500">Due date</label>
        <input
          id="dueDate"
          type="date"
          bind:value={invoice.dueDate}
          class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
      </div>
    </div>
  </section>

  <!-- From / To -->
  <section class="grid grid-cols-1 gap-8 sm:grid-cols-2">
    <div class="space-y-4">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-zinc-500">From</h2>
      <div>
        <label for="fromName" class="mb-1 block text-xs text-zinc-500">Name</label>
        <input
          id="fromName"
          type="text"
          bind:value={invoice.from.name}
          placeholder="Your name or business"
          class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
      </div>
      <div>
        <label for="fromAddress" class="mb-1 block text-xs text-zinc-500">Address</label>
        <textarea
          id="fromAddress"
          bind:value={invoice.from.address}
          rows="3"
          placeholder="Street, City, Country"
          class="w-full resize-none border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        ></textarea>
      </div>
      <div>
        <label for="fromEmail" class="mb-1 block text-xs text-zinc-500">Email</label>
        <input
          id="fromEmail"
          type="email"
          bind:value={invoice.from.email}
          placeholder="you@example.com"
          class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
      </div>
    </div>

    <div class="space-y-4">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-zinc-500">Bill to</h2>
      <div>
        <label for="toName" class="mb-1 block text-xs text-zinc-500">Name</label>
        <input
          id="toName"
          type="text"
          bind:value={invoice.to.name}
          placeholder="Client name or business"
          class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
      </div>
      <div>
        <label for="toAddress" class="mb-1 block text-xs text-zinc-500">Address</label>
        <textarea
          id="toAddress"
          bind:value={invoice.to.address}
          rows="3"
          placeholder="Street, City, Country"
          class="w-full resize-none border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        ></textarea>
      </div>
      <div>
        <label for="toEmail" class="mb-1 block text-xs text-zinc-500">Email</label>
        <input
          id="toEmail"
          type="email"
          bind:value={invoice.to.email}
          placeholder="client@example.com"
          class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
      </div>
    </div>
  </section>

  <!-- Line Items -->
  <section class="space-y-4">
    <h2 class="text-sm font-semibold uppercase tracking-wider text-zinc-500">Items</h2>

    <div class="hidden border-b border-zinc-200 pb-2 sm:grid sm:grid-cols-12 sm:gap-2">
      <span class="col-span-5 text-xs text-zinc-500">Description</span>
      <span class="col-span-2 text-xs text-zinc-500">Quantity</span>
      <span class="col-span-2 text-xs text-zinc-500">Price</span>
      <span class="col-span-2 text-xs text-zinc-500">Total</span>
      <span class="col-span-1"></span>
    </div>

    {#each invoice.items as item (item.id)}
      <div class="grid grid-cols-1 gap-2 border-b border-zinc-100 pb-3 sm:grid-cols-12 sm:items-center sm:gap-2">
        <div class="sm:col-span-5">
          <label for="desc-{item.id}" class="mb-1 block text-xs text-zinc-500 sm:hidden">Description</label>
          <input
            id="desc-{item.id}"
            type="text"
            value={item.description}
            oninput={(e) => updateItem(item.id, 'description', (e.target as HTMLInputElement).value)}
            placeholder="Item description"
            class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </div>
        <div class="sm:col-span-2">
          <label for="qty-{item.id}" class="mb-1 block text-xs text-zinc-500 sm:hidden">Quantity</label>
          <input
            id="qty-{item.id}"
            type="number"
            value={item.quantity}
            oninput={(e) => updateItem(item.id, 'quantity', Number((e.target as HTMLInputElement).value))}
            min="0"
            class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </div>
        <div class="sm:col-span-2">
          <label for="price-{item.id}" class="mb-1 block text-xs text-zinc-500 sm:hidden">Price</label>
          <input
            id="price-{item.id}"
            type="number"
            value={item.price}
            oninput={(e) => updateItem(item.id, 'price', Number((e.target as HTMLInputElement).value))}
            min="0"
            step="0.01"
            class="w-full border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </div>
        <div class="flex items-center py-2 pl-3 text-sm font-medium tabular-nums sm:col-span-2">
          <span class="text-xs text-zinc-500 sm:hidden">Total: </span>
          {selectedCurrency.symbol} {(item.quantity * item.price).toLocaleString(selectedCurrency.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div class="flex justify-end sm:col-span-1">
          <button
            onclick={() => removeItem(item.id)}
            disabled={invoice.items.length === 1}
            class="px-2 py-1 text-xs text-zinc-400 hover:text-red-600 disabled:invisible"
            aria-label="Remove item"
          >
            Remove
          </button>
        </div>
      </div>
    {/each}

    <button
      onclick={addItem}
      class="border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:border-black hover:text-black"
    >
      + Add item
    </button>
  </section>

  <!-- Notes -->
  <section class="space-y-4">
    <h2 class="text-sm font-semibold uppercase tracking-wider text-zinc-500">Notes</h2>
    <textarea
      bind:value={invoice.notes}
      rows="3"
      placeholder="Payment terms, bank details, or any additional notes"
      class="w-full resize-none border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
    ></textarea>
  </section>
</div>
