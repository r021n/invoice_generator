<script lang="ts">
  import type { InvoiceData, InvoiceColumn, ColumnType } from './invoice';
  import {
    generateId,
    CURRENCIES,
    calculateItemTotal,
    formatCurrency,
  } from './invoice';

  let { invoice = $bindable() }: { invoice: InvoiceData } = $props();

  let selectedCurrency = $derived(
    CURRENCIES.find((c) => c.code === invoice.currency) ?? CURRENCIES[0]
  );

  let showAddColModal = $state(false);
  let newColLabel = $state('');
  let newColType = $state<ColumnType>('text');

  function addItem() {
    const newValues: Record<string, string | number> = {};
    for (const col of invoice.columns) {
      if (col.type === 'number') newValues[col.id] = 1;
      else if (col.type === 'currency') newValues[col.id] = 0;
      else if (col.type === 'text') newValues[col.id] = '';
    }
    invoice.items = [...invoice.items, { id: generateId(), values: newValues }];
  }

  function removeItem(id: string) {
    if (invoice.items.length > 1) {
      invoice.items = invoice.items.filter((item) => item.id !== id);
    }
  }

  function updateColumnLabel(colId: string, label: string) {
    invoice.columns = invoice.columns.map((c) => (c.id === colId ? { ...c, label } : c));
  }

  function addColumn() {
    if (!newColLabel.trim()) return;
    const newId = `col_${generateId().slice(0, 8)}`;
    const newCol: InvoiceColumn = {
      id: newId,
      label: newColLabel.trim(),
      type: newColType,
      isRemovable: true,
    };

    // Insert before the total column if total exists, otherwise append
    const totalIndex = invoice.columns.findIndex((c) => c.type === 'total');
    if (totalIndex !== -1) {
      const updated = [...invoice.columns];
      updated.splice(totalIndex, 0, newCol);
      invoice.columns = updated;
    } else {
      invoice.columns = [...invoice.columns, newCol];
    }

    // Set initial value for existing items
    invoice.items = invoice.items.map((item) => ({
      ...item,
      values: {
        ...item.values,
        [newId]: newColType === 'number' ? 1 : newColType === 'currency' ? 0 : '',
      },
    }));

    newColLabel = '';
    newColType = 'text';
    showAddColModal = false;
  }

  function removeColumn(colId: string) {
    invoice.columns = invoice.columns.filter((c) => c.id !== colId);
    invoice.items = invoice.items.map((item) => {
      const copy = { ...item.values };
      delete copy[colId];
      return { ...item, values: copy };
    });
  }

  function moveColumn(index: number, direction: 'left' | 'right') {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= invoice.columns.length) return;
    const newCols = [...invoice.columns];
    const [moved] = newCols.splice(index, 1);
    newCols.splice(targetIndex, 0, moved);
    invoice.columns = newCols;
  }
</script>

<div class="space-y-8">
  <!-- Invoice Details -->
  <section class="space-y-4">
    <div class="flex items-center justify-between border-b border-zinc-100 pb-2">
      <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-600">Detail Faktur / Invoice Details</h2>
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div>
        <label for="invoiceNumber" class="mb-1 block text-xs font-medium text-zinc-600">Nomor Invoice</label>
        <input
          id="invoiceNumber"
          type="text"
          bind:value={invoice.invoiceNumber}
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label for="currency" class="mb-1 block text-xs font-medium text-zinc-600">Mata Uang</label>
        <select
          id="currency"
          bind:value={invoice.currency}
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        >
          {#each CURRENCIES as currency (currency.code)}
            <option value={currency.code}>{currency.symbol} - {currency.name} ({currency.code})</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="date" class="mb-1 block text-xs font-medium text-zinc-600">Tanggal Terbit</label>
        <input
          id="date"
          type="date"
          bind:value={invoice.date}
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label for="dueDate" class="mb-1 block text-xs font-medium text-zinc-600">Jatuh Tempo</label>
        <input
          id="dueDate"
          type="date"
          bind:value={invoice.dueDate}
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
    </div>
  </section>

  <!-- From / To -->
  <section class="grid grid-cols-1 gap-8 sm:grid-cols-2">
    <div class="space-y-4">
      <div class="border-b border-zinc-100 pb-2">
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-600">Pengirim (From)</h2>
      </div>
      <div>
        <label for="fromName" class="mb-1 block text-xs font-medium text-zinc-600">Nama / Bisnis</label>
        <input
          id="fromName"
          type="text"
          bind:value={invoice.from.name}
          placeholder="Nama Anda / Perusahaan"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label for="fromAddress" class="mb-1 block text-xs font-medium text-zinc-600">Alamat</label>
        <textarea
          id="fromAddress"
          bind:value={invoice.from.address}
          rows="3"
          placeholder="Jalan, Kota, Kode Pos"
          class="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        ></textarea>
      </div>
      <div>
        <label for="fromEmail" class="mb-1 block text-xs font-medium text-zinc-600">Email / Kontak</label>
        <input
          id="fromEmail"
          type="email"
          bind:value={invoice.from.email}
          placeholder="email@bisnis.com"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
    </div>

    <div class="space-y-4">
      <div class="border-b border-zinc-100 pb-2">
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-600">Tujuan Tagihan (Bill To)</h2>
      </div>
      <div>
        <label for="toName" class="mb-1 block text-xs font-medium text-zinc-600">Nama Klien / Bisnis</label>
        <input
          id="toName"
          type="text"
          bind:value={invoice.to.name}
          placeholder="Nama Klien / Perusahaan"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label for="toAddress" class="mb-1 block text-xs font-medium text-zinc-600">Alamat</label>
        <textarea
          id="toAddress"
          bind:value={invoice.to.address}
          rows="3"
          placeholder="Alamat Penerima Tagihan"
          class="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        ></textarea>
      </div>
      <div>
        <label for="toEmail" class="mb-1 block text-xs font-medium text-zinc-600">Email Klien</label>
        <input
          id="toEmail"
          type="email"
          bind:value={invoice.to.email}
          placeholder="klien@example.com"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
    </div>
  </section>

  <!-- Dynamic Columns & Line Items -->
  <section class="space-y-4">
    <!-- Header with Column Customization Bar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3">
      <div>
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-600">Item & Kolom Tabel</h2>
        <p class="text-xs text-zinc-500">Anda dapat mengubah nama kolom langsung atau menambah kolom baru.</p>
      </div>
      <button
        type="button"
        onclick={() => (showAddColModal = true)}
        class="inline-flex items-center gap-1.5 self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        + Tambah Kolom
      </button>
    </div>

    <!-- Add Column Modal / Popover -->
    {#if showAddColModal}
      <div class="rounded-lg border border-zinc-300 bg-zinc-50 p-4 shadow-sm space-y-3 animate-in fade-in duration-150">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-zinc-800 uppercase tracking-wide">Tambah Kolom Kustom Baru</h3>
          <button
            type="button"
            onclick={() => (showAddColModal = false)}
            class="text-xs text-zinc-400 hover:text-zinc-700"
          >
            ✕ Batal
          </button>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="sm:col-span-2">
            <label for="newColLabel" class="block text-xs font-medium text-zinc-600 mb-1">Nama Kolom</label>
            <input
              id="newColLabel"
              type="text"
              bind:value={newColLabel}
              placeholder="Contoh: Unit, Diskon, SKU, Keterangan"
              class="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
              onkeydown={(e) => e.key === 'Enter' && addColumn()}
            />
          </div>
          <div>
            <label for="newColType" class="block text-xs font-medium text-zinc-600 mb-1">Tipe Data</label>
            <select
              id="newColType"
              bind:value={newColType}
              class="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
            >
              <option value="text">Teks (Deskripsi, Unit, Catatan)</option>
              <option value="number">Angka (Qty, Persentase)</option>
              <option value="currency">Mata Uang / Harga</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onclick={() => (showAddColModal = false)}
            class="rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100"
          >
            Batal
          </button>
          <button
            type="button"
            onclick={addColumn}
            disabled={!newColLabel.trim()}
            class="rounded bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Simpan Kolom
          </button>
        </div>
      </div>
    {/if}

    <!-- Columns Management Chips & Rename Bar -->
    <div class="rounded-md border border-zinc-200 bg-zinc-50/50 p-3">
      <div class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
        Daftar Kolom Aktif (Klik untuk ubah nama):
      </div>
      <div class="flex flex-wrap items-center gap-2">
        {#each invoice.columns as col, idx (col.id)}
          <div class="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-2.5 py-1.5 shadow-xs">
            <!-- Column Move buttons -->
            {#if idx > 0 && col.type !== 'total'}
              <button
                type="button"
                onclick={() => moveColumn(idx, 'left')}
                class="text-zinc-400 hover:text-zinc-800 text-xs px-0.5"
                title="Geser ke kiri"
              >
                ◀
              </button>
            {/if}

            <!-- Editable Column Name -->
            <input
              type="text"
              value={col.label}
              oninput={(e) => updateColumnLabel(col.id, (e.target as HTMLInputElement).value)}
              class="border-b border-transparent bg-transparent text-xs font-semibold text-zinc-800 hover:border-zinc-300 focus:border-zinc-900 focus:bg-zinc-50 focus:outline-none px-1 py-0.5 w-24 sm:w-28 text-center"
              title="Klik untuk mengubah nama kolom"
            />

            <!-- Type badge -->
            <span class="rounded bg-zinc-100 px-1 py-0.5 text-[10px] text-zinc-500 font-mono">
              {col.type === 'total' ? 'auto' : col.type}
            </span>

            {#if idx < invoice.columns.length - 2 && col.type !== 'total'}
              <button
                type="button"
                onclick={() => moveColumn(idx, 'right')}
                class="text-zinc-400 hover:text-zinc-800 text-xs px-0.5"
                title="Geser ke kanan"
              >
                ▶
              </button>
            {/if}

            <!-- Delete column button (if removable) -->
            {#if col.isRemovable}
              <button
                type="button"
                onclick={() => removeColumn(col.id)}
                class="ml-1 text-zinc-400 hover:text-red-600 text-xs"
                title="Hapus kolom ini"
              >
                ✕
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Items List / Table View -->
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {#each invoice.columns as col (col.id)}
              <th class="py-2.5 px-3 {col.type === 'number' || col.type === 'currency' || col.type === 'total' ? 'text-right' : 'text-left'}">
                {col.label}
              </th>
            {/each}
            <th class="w-10 py-2.5 px-2 text-center"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100">
          {#each invoice.items as item (item.id)}
            <tr class="hover:bg-zinc-50/50 transition">
              {#each invoice.columns as col (col.id)}
                <td class="py-2 px-2">
                  {#if col.type === 'text'}
                    <input
                      type="text"
                      bind:value={item.values[col.id]}
                      placeholder={col.label}
                      class="w-full rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  {:else if col.type === 'number'}
                    <input
                      type="number"
                      bind:value={item.values[col.id]}
                      min="0"
                      step="any"
                      placeholder="0"
                      class="w-full text-right rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 tabular-nums focus:border-zinc-900 focus:outline-none"
                    />
                  {:else if col.type === 'currency'}
                    <input
                      type="number"
                      bind:value={item.values[col.id]}
                      min="0"
                      step="any"
                      placeholder="0"
                      class="w-full text-right rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 tabular-nums focus:border-zinc-900 focus:outline-none"
                    />
                  {:else if col.type === 'total'}
                    <div class="py-1.5 px-2 text-right font-medium text-xs tabular-nums text-zinc-900">
                      {formatCurrency(calculateItemTotal(item, invoice.columns), selectedCurrency)}
                    </div>
                  {/if}
                </td>
              {/each}
              <td class="py-2 px-2 text-center">
                <button
                  type="button"
                  onclick={() => removeItem(item.id)}
                  disabled={invoice.items.length === 1}
                  class="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-0 transition"
                  title="Hapus baris"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <button
      type="button"
      onclick={addItem}
      class="inline-flex items-center gap-1.5 rounded border border-dashed border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
      + Tambah Baris Item
    </button>
  </section>

  <!-- Notes -->
  <section class="space-y-3">
    <div class="border-b border-zinc-100 pb-2">
      <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-600">Catatan & Informasi Pembayaran (Notes)</h2>
    </div>
    <textarea
      bind:value={invoice.notes}
      rows="3"
      placeholder="Ketentuan pembayaran, rekening bank (BCA, Mandiri, dsb), atau catatan tambahan..."
      class="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
    ></textarea>
  </section>
</div>

