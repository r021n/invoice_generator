<script lang="ts">
  import type { InvoiceData, InvoiceColumn, ColumnType, InvoiceItem } from './invoice';
  import {
    generateId,
    CURRENCIES,
    calculateItemTotal,
  } from './invoice';
  import { formatCurrencyAmount } from './formatters';
  import CurrencyInput from './components/CurrencyInput.svelte';

  interface Props {
    invoice: InvoiceData;
    onItemRemoved?: (item: InvoiceItem, index: number) => void;
  }

  let { invoice = $bindable(), onItemRemoved }: Props = $props();

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
      const index = invoice.items.findIndex((item) => item.id === id);
      if (index !== -1) {
        const removed = invoice.items[index];
        invoice.items = invoice.items.filter((item) => item.id !== id);
        onItemRemoved?.(removed, index);
      }
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

    // Sisipkan sebelum kolom total jika kolom total ada, atau tambahkan di akhir
    const totalIndex = invoice.columns.findIndex((c) => c.type === 'total');
    if (totalIndex !== -1) {
      const updated = [...invoice.columns];
      updated.splice(totalIndex, 0, newCol);
      invoice.columns = updated;
    } else {
      invoice.columns = [...invoice.columns, newCol];
    }

    // Set nilai awal untuk item yang sudah ada
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
  <!-- 1. Detail Faktur -->
  <section class="space-y-4">
    <div class="flex items-center justify-between border-b border-zinc-200 pb-2">
      <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-700">Informasi Faktur</h2>
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div>
        <label for="invoiceNumber" class="mb-1 block text-xs font-medium text-zinc-700">Nomor Faktur</label>
        <input
          id="invoiceNumber"
          type="text"
          bind:value={invoice.invoiceNumber}
          aria-label="Nomor Faktur"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label for="currency" class="mb-1 block text-xs font-medium text-zinc-700">Mata Uang</label>
        <select
          id="currency"
          bind:value={invoice.currency}
          aria-label="Mata Uang Faktur"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        >
          {#each CURRENCIES as currency (currency.code)}
            <option value={currency.code}>{currency.symbol} - {currency.name} ({currency.code})</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="date" class="mb-1 block text-xs font-medium text-zinc-700">Tanggal Terbit</label>
        <input
          id="date"
          type="date"
          bind:value={invoice.date}
          aria-label="Tanggal Terbit Faktur"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label for="dueDate" class="mb-1 block text-xs font-medium text-zinc-700">Tanggal Jatuh Tempo</label>
        <input
          id="dueDate"
          type="date"
          bind:value={invoice.dueDate}
          aria-label="Tanggal Jatuh Tempo"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
    </div>
  </section>

  <!-- 2. Pengirim & Penerima Tagihan -->
  <section class="grid grid-cols-1 gap-8 sm:grid-cols-2">
    <!-- Pengirim -->
    <div class="space-y-4">
      <div class="border-b border-zinc-200 pb-2">
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-700">Pengirim (Dari)</h2>
      </div>
      <div>
        <label for="fromName" class="mb-1 block text-xs font-medium text-zinc-700">Nama Anda / Bisnis</label>
        <input
          id="fromName"
          type="text"
          bind:value={invoice.from.name}
          placeholder="Nama Anda atau Perusahaan Pengirim"
          aria-label="Nama Pengirim"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label for="fromAddress" class="mb-1 block text-xs font-medium text-zinc-700">Alamat Lengkap</label>
        <textarea
          id="fromAddress"
          bind:value={invoice.from.address}
          rows="3"
          placeholder="Jalan, Kota, Kode Pos"
          aria-label="Alamat Pengirim"
          class="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        ></textarea>
      </div>
      <div>
        <label for="fromEmail" class="mb-1 block text-xs font-medium text-zinc-700">Email atau No. Telepon</label>
        <input
          id="fromEmail"
          type="text"
          bind:value={invoice.from.email}
          placeholder="kontak@perusahaan.com"
          aria-label="Email atau Kontak Pengirim"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
    </div>

    <!-- Penerima -->
    <div class="space-y-4">
      <div class="border-b border-zinc-200 pb-2">
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-700">Ditujukan Kepada (Klien)</h2>
      </div>
      <div>
        <label for="toName" class="mb-1 block text-xs font-medium text-zinc-700">Nama Klien / Perusahaan</label>
        <input
          id="toName"
          type="text"
          bind:value={invoice.to.name}
          placeholder="Nama Klien atau Instansi Penerima"
          aria-label="Nama Klien Penerima"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label for="toAddress" class="mb-1 block text-xs font-medium text-zinc-700">Alamat Klien</label>
        <textarea
          id="toAddress"
          bind:value={invoice.to.address}
          rows="3"
          placeholder="Alamat Lengkap Penerima Tagihan"
          aria-label="Alamat Klien Penerima"
          class="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        ></textarea>
      </div>
      <div>
        <label for="toEmail" class="mb-1 block text-xs font-medium text-zinc-700">Email Klien</label>
        <input
          id="toEmail"
          type="text"
          bind:value={invoice.to.email}
          placeholder="klien@instansi.com"
          aria-label="Email Klien Penerima"
          class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
    </div>
  </section>

  <!-- 3. Daftar Item & Tabel Kolom Dinamis -->
  <section class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3">
      <div>
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-700">Daftar Item & Jasa</h2>
        <p class="text-xs text-zinc-500">Klik langsung judul kolom di tabel untuk mengubah nama atau tambah kolom kustom.</p>
      </div>
      <button
        type="button"
        onclick={() => (showAddColModal = !showAddColModal)}
        class="inline-flex items-center gap-1.5 self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        <span>+ Tambah Kolom</span>
      </button>
    </div>

    <!-- Modal / Popover Tambah Kolom Kustom -->
    {#if showAddColModal}
      <div class="rounded-md border border-zinc-300 bg-zinc-50 p-4 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-zinc-800 uppercase tracking-wide">Tambah Kolom Kustom Baru</h3>
          <button
            type="button"
            onclick={() => (showAddColModal = false)}
            class="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-1"
            aria-label="Tutup form tambah kolom"
          >
            ✕ Batal
          </button>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="sm:col-span-2">
            <label for="newColLabel" class="block text-xs font-medium text-zinc-700 mb-1">Nama Kolom</label>
            <input
              id="newColLabel"
              type="text"
              bind:value={newColLabel}
              placeholder="Contoh: Satuan, SKU, Diskon, Keterangan"
              class="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
              onkeydown={(e) => e.key === 'Enter' && addColumn()}
            />
          </div>
          <div>
            <label for="newColType" class="block text-xs font-medium text-zinc-700 mb-1">Tipe Data</label>
            <select
              id="newColType"
              bind:value={newColType}
              class="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
            >
              <option value="text">Teks (Keterangan, Satuan)</option>
              <option value="number">Angka (Jumlah, Satuan Ukuran)</option>
              <option value="currency">Mata Uang (Nominal Tambahan)</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onclick={() => (showAddColModal = false)}
            class="rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
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

    <!-- Tabel Item -->
    <div class="overflow-x-auto rounded border border-zinc-200">
      <table class="w-full border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-700">
            {#each invoice.columns as col, idx (col.id)}
              <th class="py-2.5 px-3 {col.type === 'number' || col.type === 'currency' || col.type === 'total' ? 'text-right' : 'text-left'}">
                <div class="flex items-center gap-1.5 {col.type === 'number' || col.type === 'currency' || col.type === 'total' ? 'justify-end' : 'justify-start'}">
                  {#if col.type !== 'total'}
                    <input
                      type="text"
                      value={col.label}
                      oninput={(e) => updateColumnLabel(col.id, (e.target as HTMLInputElement).value)}
                      title="Klik untuk mengubah nama kolom"
                      aria-label="Ubah nama kolom {col.label}"
                      class="border-b border-transparent bg-transparent text-xs font-semibold text-zinc-800 hover:border-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none px-1 py-0.5 max-w-[120px] transition"
                    />
                  {:else}
                    <span class="px-1 text-xs font-bold text-zinc-900 uppercase">{col.label}</span>
                  {/if}

                  <!-- Tombol Kontrol Kolom Kustom (Geser / Hapus) -->
                  {#if col.isRemovable}
                    <div class="inline-flex items-center gap-0.5 ml-1">
                      {#if idx > 0 && col.type !== 'total'}
                        <button
                          type="button"
                          onclick={() => moveColumn(idx, 'left')}
                          class="p-0.5 text-zinc-500 hover:text-zinc-900"
                          title="Geser kolom ke kiri"
                          aria-label="Geser kolom ke kiri"
                        >
                          ◀
                        </button>
                      {/if}
                      {#if idx < invoice.columns.length - 2 && col.type !== 'total'}
                        <button
                          type="button"
                          onclick={() => moveColumn(idx, 'right')}
                          class="p-0.5 text-zinc-500 hover:text-zinc-900"
                          title="Geser kolom ke kanan"
                          aria-label="Geser kolom ke kanan"
                        >
                          ▶
                        </button>
                      {/if}
                      <button
                        type="button"
                        onclick={() => removeColumn(col.id)}
                        class="p-0.5 text-zinc-500 hover:text-red-600 ml-0.5"
                        title="Hapus kolom ini"
                        aria-label="Hapus kolom {col.label}"
                      >
                        ✕
                      </button>
                    </div>
                  {/if}
                </div>
              </th>
            {/each}
            <th class="w-12 py-2.5 px-2 text-center" aria-label="Aksi Baris"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-200 bg-white">
          {#each invoice.items as item, itemIdx (item.id)}
            <tr class="hover:bg-zinc-50/75 transition">
              {#each invoice.columns as col (col.id)}
                <td class="py-2 px-2.5">
                  {#if col.type === 'text'}
                    <input
                      type="text"
                      bind:value={item.values[col.id]}
                      placeholder={col.label}
                      aria-label="{col.label} baris {itemIdx + 1}"
                      class="w-full rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  {:else if col.type === 'number'}
                    <input
                      type="number"
                      bind:value={item.values[col.id]}
                      min="0"
                      step="any"
                      placeholder="0"
                      aria-label="{col.label} baris {itemIdx + 1}"
                      class="w-full text-right rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 tabular-nums focus:border-zinc-900 focus:outline-none"
                    />
                  {:else if col.type === 'currency'}
                    <CurrencyInput
                      bind:value={item.values[col.id] as number}
                      currency={invoice.currency}
                      ariaLabel="{col.label} baris {itemIdx + 1}"
                      placeholder="0"
                    />
                  {:else if col.type === 'total'}
                    <div class="py-1.5 px-2 text-right font-semibold text-xs tabular-nums text-zinc-900">
                      {formatCurrencyAmount(calculateItemTotal(item, invoice.columns), invoice.currency)}
                    </div>
                  {/if}
                </td>
              {/each}
              <td class="py-2 px-2 text-center">
                <button
                  type="button"
                  onclick={() => removeItem(item.id)}
                  disabled={invoice.items.length === 1}
                  class="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-0 transition"
                  title="Hapus baris item"
                  aria-label="Hapus baris item ke-{itemIdx + 1}"
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
      class="inline-flex items-center gap-1.5 rounded border border-dashed border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-900 hover:text-zinc-900 transition"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
      + Tambah Baris Item
    </button>
  </section>

  <!-- 4. Catatan & Ketentuan Pembayaran -->
  <section class="space-y-3">
    <div class="border-b border-zinc-200 pb-2">
      <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-700">Catatan & Ketentuan Pembayaran</h2>
    </div>
    <textarea
      bind:value={invoice.notes}
      rows="3"
      placeholder="Ketentuan pembayaran, rekening bank transfer (BCA, Mandiri, dll), atau ucapan terima kasih..."
      aria-label="Catatan dan Ketentuan Pembayaran"
      class="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
    ></textarea>
  </section>
</div>
