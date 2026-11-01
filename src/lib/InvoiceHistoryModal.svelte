<script lang="ts">
  import {
    listInvoices,
    deleteInvoice,
    getInvoice,
    exportDatabase,
    importDatabase,
    type InvoiceSummary,
  } from './db';
  import type { InvoiceData } from './invoice';
  import { generatePdf } from './generatePdf';
  import { formatCurrencyAmount, formatRelativeOrDate } from './formatters';

  interface Props {
    isOpen: boolean;
    currentInvoiceId: string | null;
    onClose: () => void;
    onSelectInvoice: (invoice: InvoiceData, id: string) => void;
    onDuplicateInvoice: (invoice: InvoiceData) => void;
    onDatabaseMutated?: () => void;
  }

  let {
    isOpen,
    currentInvoiceId,
    onClose,
    onSelectInvoice,
    onDuplicateInvoice,
    onDatabaseMutated,
  }: Props = $props();

  let searchQuery = $state('');
  let invoices = $state<InvoiceSummary[]>([]);
  let isLoading = $state(false);
  let deletingId = $state<string | null>(null);
  let deleteConfirmId = $state<string | null>(null);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let fileInputRef = $state<HTMLInputElement | null>(null);

  async function loadInvoices() {
    isLoading = true;
    try {
      invoices = await listInvoices(searchQuery);
    } catch (err) {
      console.error('Failed to list invoices:', err);
      showMessage('error', 'Gagal memuat daftar faktur dari penyimpanan');
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      loadInvoices();
      // Kunci scroll body saat modal aktif
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      onClose();
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    message = { type, text };
    setTimeout(() => {
      message = null;
    }, 4000);
  }

  async function handleSearch() {
    await loadInvoices();
  }

  async function handleOpen(summary: InvoiceSummary) {
    try {
      const record = await getInvoice(summary.id);
      if (record) {
        onSelectInvoice(record.data, record.id);
        onClose();
      } else {
        showMessage('error', 'Data faktur tidak ditemukan');
      }
    } catch (err) {
      console.error(err);
      showMessage('error', 'Terjadi kesalahan saat memuat faktur');
    }
  }

  async function handleDuplicate(summary: InvoiceSummary) {
    try {
      const record = await getInvoice(summary.id);
      if (record) {
        const copy: InvoiceData = JSON.parse(JSON.stringify(record.data));
        copy.invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
        copy.date = new Date().toISOString().split('T')[0];
        onDuplicateInvoice(copy);
        onClose();
      }
    } catch (err) {
      console.error(err);
      showMessage('error', 'Gagal menduplikasi faktur');
    }
  }

  async function handleQuickPdf(summary: InvoiceSummary) {
    try {
      const record = await getInvoice(summary.id);
      if (record) {
        generatePdf(record.data);
      }
    } catch (err) {
      console.error(err);
      showMessage('error', 'Gagal mengekspor PDF');
    }
  }

  async function confirmDelete(id: string) {
    deletingId = id;
    try {
      await deleteInvoice(id);
      deleteConfirmId = null;
      showMessage('success', 'Faktur berhasil dihapus');
      await loadInvoices();
      onDatabaseMutated?.();
    } catch (err) {
      console.error(err);
      showMessage('error', 'Gagal menghapus faktur');
    } finally {
      deletingId = null;
    }
  }

  async function handleExportDb() {
    try {
      const binary = await exportDatabase();
      const blob = new Blob([binary.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cadangan_faktur_${new Date().toISOString().slice(0, 10)}.sqlite`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('success', 'Cadangan data berhasil diunduh');
    } catch (err) {
      console.error(err);
      showMessage('error', 'Gagal mencadangkan data');
    }
  }

  async function handleImportDb(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      await importDatabase(new Uint8Array(arrayBuffer));
      showMessage('success', 'Data faktur berhasil dipulihkan');
      await loadInvoices();
      onDatabaseMutated?.();
    } catch (err) {
      console.error(err);
      showMessage('error', 'Gagal memulihkan file cadangan: format tidak valid');
    } finally {
      if (fileInputRef) {
        fileInputRef.value = '';
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
    aria-labelledby="history-modal-title"
  >
    <div
      class="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-sm border border-zinc-200 bg-white shadow-2xl"
    >
      <!-- Header Modal -->
      <div class="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <div>
          <h2 id="history-modal-title" class="text-lg font-bold tracking-tight text-zinc-900">
            Riwayat Faktur
          </h2>
          <p class="text-xs text-zinc-600">
            Daftar seluruh faktur yang tersimpan aman secara lokal di perangkat Anda.
          </p>
        </div>
        <button
          onclick={onClose}
          aria-label="Tutup jendela riwayat"
          class="rounded p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <!-- Pencarian & Manajemen Cadangan -->
      <div
        class="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/75 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="relative flex-1">
          <input
            type="text"
            placeholder="Cari nomor faktur, nama klien, atau pengirim..."
            bind:value={searchQuery}
            oninput={handleSearch}
            aria-label="Cari faktur tersimpan"
            class="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 pl-8 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
          <svg
            class="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div class="flex items-center gap-2">
          <button
            onclick={handleExportDb}
            class="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
            title="Unduh seluruh data faktur sebagai cadangan lokal"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Cadangkan Data</span>
          </button>

          <label
            class="inline-flex cursor-pointer items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
            title="Pulihkan database dari file cadangan .sqlite"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"
              />
            </svg>
            <span>Pulihkan Data</span>
            <input
              type="file"
              accept=".sqlite,.db"
              bind:this={fileInputRef}
              onchange={handleImportDb}
              class="hidden"
            />
          </label>
        </div>
      </div>

      <!-- Pesan Notifikasi -->
      {#if message}
        <div
          class="px-6 py-2 text-xs font-semibold {message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
            : 'bg-rose-50 text-rose-800 border-b border-rose-100'}"
        >
          {message.text}
        </div>
      {/if}

      <!-- Daftar Faktur -->
      <div class="flex-1 overflow-y-auto p-6">
        {#if isLoading}
          <div class="py-12 text-center text-xs text-zinc-600">Memuat data faktur...</div>
        {:else if invoices.length === 0}
          <div class="py-12 text-center">
            <div class="text-sm font-semibold text-zinc-900">Tidak ada faktur ditemukan</div>
            <p class="mt-1 text-xs text-zinc-600">
              {searchQuery
                ? 'Tidak ada faktur yang cocok dengan kata kunci pencarian.'
                : 'Faktur yang Anda buat akan otomatis tersimpan di sini.'}
            </p>
          </div>
        {:else}
          <div class="divide-y divide-zinc-200 border border-zinc-200 rounded-sm">
            {#each invoices as item (item.id)}
              <div
                class="flex flex-col gap-4 p-4 transition-colors hover:bg-zinc-50/75 sm:flex-row sm:items-center sm:justify-between {item.id ===
                currentInvoiceId
                  ? 'bg-amber-50/60'
                  : ''}"
              >
                <!-- Detail Kiri -->
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-sm font-bold text-zinc-900">
                      {item.invoice_number}
                    </span>
                    {#if item.id === currentInvoiceId}
                      <span
                        class="rounded bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900"
                      >
                        Sedang Dibuka
                      </span>
                    {/if}
                  </div>
                  <div class="flex flex-wrap items-center gap-x-2 text-xs text-zinc-600">
                    <span>Klien: <strong class="text-zinc-800">{item.toName || '(Tanpa Nama)'}</strong></span>
                    <span>•</span>
                    <span>Terbit: {formatRelativeOrDate(item.date)}</span>
                    {#if item.dueDate}
                      <span>•</span>
                      <span>Tempo: {formatRelativeOrDate(item.dueDate)}</span>
                    {/if}
                  </div>
                </div>

                <!-- Bagian Kanan: Total & Aksi -->
                <div class="flex items-center justify-between gap-4 sm:justify-end">
                  <div class="text-right">
                    <div class="font-mono text-sm font-bold text-zinc-900">
                      {formatCurrencyAmount(item.subtotal, item.currency)}
                    </div>
                    <div class="text-xs text-zinc-500">
                      Diperbarui {formatRelativeOrDate(item.updatedAt)}
                    </div>
                  </div>

                  <!-- Aksi -->
                  <div class="flex items-center gap-1.5">
                    <button
                      onclick={() => handleOpen(item)}
                      class="rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition"
                      title="Buka dan sunting faktur ini"
                    >
                      Buka
                    </button>
                    <button
                      onclick={() => handleDuplicate(item)}
                      class="rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition"
                      title="Salin sebagai draf baru"
                    >
                      Salin
                    </button>
                    <button
                      onclick={() => handleQuickPdf(item)}
                      class="rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition"
                      title="Unduh dokumen PDF langsung"
                    >
                      PDF
                    </button>

                    {#if deleteConfirmId === item.id}
                      <div class="flex items-center gap-1 bg-rose-50 p-1 rounded">
                        <button
                          onclick={() => confirmDelete(item.id)}
                          disabled={deletingId === item.id}
                          class="rounded bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-700"
                        >
                          Hapus
                        </button>
                        <button
                          onclick={() => (deleteConfirmId = null)}
                          class="rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                        >
                          Batal
                        </button>
                      </div>
                    {:else}
                      <button
                        onclick={() => (deleteConfirmId = item.id)}
                        class="rounded p-2 text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus faktur ini"
                        aria-label="Hapus faktur {item.invoice_number}"
                      >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer Modal -->
      <div class="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-3">
        <span class="text-xs text-zinc-600">
          Total tersimpan: <strong class="text-zinc-900">{invoices.length}</strong> faktur
        </span>
        <button
          onclick={onClose}
          class="rounded border border-zinc-300 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}
