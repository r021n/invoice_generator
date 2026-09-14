<script lang="ts">
  import {
    listInvoices,
    deleteInvoice,
    getInvoice,
    exportDatabase,
    importDatabase,
    type InvoiceSummary,
  } from './db';
  import { formatCurrency, CURRENCIES, type InvoiceData } from './invoice';
  import { generatePdf } from './generatePdf';

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
      showMessage('error', 'Failed to load invoices from database');
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      loadInvoices();
    }
  });

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
        showMessage('error', 'Invoice data not found');
      }
    } catch (err) {
      console.error(err);
      showMessage('error', 'Error loading invoice');
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
      showMessage('error', 'Error duplicating invoice');
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
      showMessage('error', 'Error exporting PDF');
    }
  }

  async function confirmDelete(id: string) {
    deletingId = id;
    try {
      await deleteInvoice(id);
      deleteConfirmId = null;
      showMessage('success', 'Invoice deleted from database');
      await loadInvoices();
      onDatabaseMutated?.();
    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to delete invoice');
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
      a.download = `invoices_backup_${new Date().toISOString().slice(0, 10)}.sqlite`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('success', 'SQLite database exported successfully');
    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to export SQLite database');
    }
  }

  async function handleImportDb(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      await importDatabase(new Uint8Array(arrayBuffer));
      showMessage('success', 'SQLite database restored successfully');
      await loadInvoices();
      onDatabaseMutated?.();
    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to import SQLite database: Invalid file');
    } finally {
      if (fileInputRef) {
        fileInputRef.value = '';
      }
    }
  }

  function getCurrencyObj(code: string) {
    return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
  }

  function formatDateDisplay(dateStr: string) {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
</script>

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
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <div>
          <h2 id="history-modal-title" class="text-lg font-bold tracking-tight text-zinc-900">
            Invoice History (SQLite Database)
          </h2>
          <p class="text-xs text-zinc-500">
            Manage, load, duplicate, or delete invoices stored in your local SQLite database.
          </p>
        </div>
        <button
          onclick={onClose}
          aria-label="Close modal"
          class="rounded-sm p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
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

      <!-- Controls & Search -->
      <div
        class="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/75 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="relative flex-1">
          <input
            type="text"
            placeholder="Search by invoice number, client or sender..."
            bind:value={searchQuery}
            oninput={handleSearch}
            class="w-full rounded-sm border border-zinc-300 bg-white px-3 py-1.5 pl-8 text-sm focus:border-black focus:outline-none"
          />
          <svg
            class="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400"
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
            class="inline-flex items-center gap-1 rounded-sm border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            title="Download full SQLite database binary"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export DB (.sqlite)
          </button>

          <label
            class="inline-flex cursor-pointer items-center gap-1 rounded-sm border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            title="Restore database from .sqlite file"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"
              />
            </svg>
            Import DB
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

      <!-- Notification alert if any -->
      {#if message}
        <div
          class="px-6 py-2 text-xs font-medium {message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800'
            : 'bg-rose-50 text-rose-800'}"
        >
          {message.text}
        </div>
      {/if}

      <!-- List -->
      <div class="flex-1 overflow-y-auto p-6">
        {#if isLoading}
          <div class="py-12 text-center text-sm text-zinc-500">Loading SQLite records...</div>
        {:else if invoices.length === 0}
          <div class="py-12 text-center">
            <div class="text-sm font-medium text-zinc-900">No invoices found</div>
            <p class="mt-1 text-xs text-zinc-500">
              {searchQuery
                ? 'No records match your search filter.'
                : 'Save an invoice to the database using the "Save" button in the editor.'}
            </p>
          </div>
        {:else}
          <div class="divide-y divide-zinc-200 border border-zinc-200 rounded-sm">
            {#each invoices as item (item.id)}
              <div
                class="flex flex-col gap-4 p-4 transition-colors hover:bg-zinc-50/75 sm:flex-row sm:items-center sm:justify-between {item.id ===
                currentInvoiceId
                  ? 'bg-amber-50/50'
                  : ''}"
              >
                <!-- Left Details -->
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-sm font-semibold text-zinc-900">
                      {item.invoice_number}
                    </span>
                    {#if item.id === currentInvoiceId}
                      <span
                        class="rounded-xs bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                      >
                        Currently Open
                      </span>
                    {/if}
                  </div>
                  <div class="flex flex-wrap items-center gap-x-3 text-xs text-zinc-500">
                    <span>To: <strong>{item.toName || '(No recipient)'}</strong></span>
                    <span>•</span>
                    <span>Date: {formatDateDisplay(item.date)}</span>
                    {#if item.dueDate}
                      <span>•</span>
                      <span>Due: {formatDateDisplay(item.dueDate)}</span>
                    {/if}
                  </div>
                </div>

                <!-- Right Side: Total & Actions -->
                <div class="flex items-center justify-between gap-4 sm:justify-end">
                  <div class="text-right">
                    <div class="font-mono text-sm font-bold text-zinc-900">
                      {formatCurrency(item.subtotal, getCurrencyObj(item.currency))}
                    </div>
                    <div class="text-[11px] text-zinc-400">
                      Updated {formatDateDisplay(item.updatedAt)}
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-1.5">
                    <button
                      onclick={() => handleOpen(item)}
                      class="rounded-sm bg-black px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                      title="Load and edit this invoice"
                    >
                      Open
                    </button>
                    <button
                      onclick={() => handleDuplicate(item)}
                      class="rounded-sm border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                      title="Duplicate as new draft"
                    >
                      Copy
                    </button>
                    <button
                      onclick={() => handleQuickPdf(item)}
                      class="rounded-sm border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                      title="Download PDF"
                    >
                      PDF
                    </button>

                    {#if deleteConfirmId === item.id}
                      <div class="flex items-center gap-1 bg-red-50 p-1 rounded-sm">
                        <button
                          onclick={() => confirmDelete(item.id)}
                          disabled={deletingId === item.id}
                          class="rounded-sm bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                        >
                          Confirm
                        </button>
                        <button
                          onclick={() => (deleteConfirmId = null)}
                          class="rounded-sm border border-zinc-300 bg-white px-1.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                        >
                          Cancel
                        </button>
                      </div>
                    {:else}
                      <button
                        onclick={() => (deleteConfirmId = item.id)}
                        class="rounded-sm p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete invoice"
                        aria-label="Delete invoice"
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

      <!-- Footer -->
      <div class="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-3">
        <span class="text-xs text-zinc-500">
          Total stored: <strong>{invoices.length}</strong> invoice(s)
        </span>
        <button
          onclick={onClose}
          class="rounded-sm border border-zinc-300 bg-white px-4 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
