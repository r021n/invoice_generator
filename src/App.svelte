<script lang="ts">
  import { onMount } from 'svelte';
  import InvoiceForm from './lib/InvoiceForm.svelte';
  import InvoicePreview from './lib/InvoicePreview.svelte';
  import InvoiceHistoryModal from './lib/InvoiceHistoryModal.svelte';
  import { createEmptyInvoice } from './lib/invoice';
  import { generatePdf } from './lib/generatePdf';
  import { createInvoice, updateInvoice, listInvoices, getDatabase } from './lib/db';
  import type { InvoiceData } from './lib/invoice';

  let invoice = $state<InvoiceData>(createEmptyInvoice());
  let currentInvoiceId = $state<string | null>(null);
  let activeTab = $state<'edit' | 'preview'>('edit');
  let isHistoryOpen = $state(false);
  let isSaving = $state(false);
  let savedCount = $state(0);
  let toast = $state<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function showToast(text: string, type: 'success' | 'error' | 'info' = 'success') {
    if (toastTimer) clearTimeout(toastTimer);
    toast = { text, type };
    toastTimer = setTimeout(() => {
      toast = null;
    }, 4000);
  }

  async function refreshSavedCount() {
    try {
      const items = await listInvoices();
      savedCount = items.length;
    } catch (err) {
      console.error('Failed to get invoices count:', err);
    }
  }

  onMount(() => {
    getDatabase()
      .then(() => refreshSavedCount())
      .catch((err) => console.error('DB init failed:', err));
  });

  async function handleSave() {
    isSaving = true;
    try {
      if (currentInvoiceId) {
        await updateInvoice(currentInvoiceId, invoice);
        showToast(`Invoice ${invoice.invoiceNumber} updated in SQLite database`, 'success');
      } else {
        const res = await createInvoice(invoice);
        currentInvoiceId = res.id;
        showToast(`Invoice ${invoice.invoiceNumber} saved to SQLite database`, 'success');
      }
      await refreshSavedCount();
    } catch (err) {
      console.error(err);
      showToast('Failed to save invoice to SQLite database', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function handleSaveAsNew() {
    isSaving = true;
    try {
      const copy: InvoiceData = JSON.parse(JSON.stringify(invoice));
      // If saving as new, ensure unique invoice number if same
      if (copy.invoiceNumber === invoice.invoiceNumber && currentInvoiceId) {
        copy.invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
        invoice.invoiceNumber = copy.invoiceNumber;
      }
      const res = await createInvoice(copy);
      currentInvoiceId = res.id;
      showToast(`Saved as new invoice ${copy.invoiceNumber} in database`, 'success');
      await refreshSavedCount();
    } catch (err) {
      console.error(err);
      showToast('Failed to save as new invoice', 'error');
    } finally {
      isSaving = false;
    }
  }

  function handleNewInvoice() {
    invoice = createEmptyInvoice();
    currentInvoiceId = null;
    showToast('New blank invoice initialized', 'info');
  }

  function handleSelectInvoice(selected: InvoiceData, id: string) {
    invoice = selected;
    currentInvoiceId = id;
    showToast(`Loaded invoice ${selected.invoiceNumber}`, 'info');
  }

  function handleDuplicateInvoice(duplicated: InvoiceData) {
    invoice = duplicated;
    currentInvoiceId = null;
    showToast(`Invoice cloned as new draft: ${duplicated.invoiceNumber}`, 'info');
  }

  function handleGeneratePdf() {
    generatePdf(invoice);
  }
</script>

<div class="min-h-screen bg-zinc-50 flex flex-col">
  <!-- Top Navigation / Header -->
  <header class="border-b border-zinc-200 bg-white sticky top-0 z-30 shadow-xs">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
      <div class="flex items-center gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold tracking-tight text-zinc-900">Invoice Generator</h1>
            <span class="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700">
              SQLite Active
            </span>
          </div>
          <p class="text-xs text-zinc-500">Create, save, and manage invoices with local SQLite</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={handleNewInvoice}
          class="inline-flex items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          title="Create a new blank invoice"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">New Invoice</span>
        </button>

        <button
          type="button"
          onclick={() => (isHistoryOpen = true)}
          class="relative inline-flex items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          title="Open SQLite Invoice History"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>History</span>
          {#if savedCount > 0}
            <span class="ml-0.5 rounded-full bg-zinc-900 px-1.5 py-0.2 text-[10px] font-bold text-white">
              {savedCount}
            </span>
          {/if}
        </button>

        <!-- Save Button -->
        <button
          type="button"
          onclick={handleSave}
          disabled={isSaving}
          class="inline-flex items-center gap-1.5 rounded-sm bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          title={currentInvoiceId ? 'Update this invoice in SQLite' : 'Save as new invoice to SQLite'}
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>{isSaving ? 'Saving...' : currentInvoiceId ? 'Update DB' : 'Save to DB'}</span>
        </button>

        {#if currentInvoiceId}
          <button
            type="button"
            onclick={handleSaveAsNew}
            disabled={isSaving}
            class="hidden md:inline-flex items-center gap-1 rounded-sm border border-emerald-300 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            title="Save current changes as a new separate invoice"
          >
            Save as Copy
          </button>
        {/if}

        <button
          type="button"
          onclick={handleGeneratePdf}
          class="inline-flex items-center gap-1.5 rounded-sm bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 active:bg-zinc-900"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download PDF</span>
        </button>
      </div>
    </div>

    <!-- Status Bar for Currently Open Invoice -->
    <div class="border-t border-zinc-100 bg-zinc-50/75 px-4 py-1.5 text-xs sm:px-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-zinc-500">Active Document:</span>
        <span class="font-mono font-semibold text-zinc-900">{invoice.invoiceNumber}</span>
        {#if currentInvoiceId}
          <span class="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
            Saved in SQLite (ID: {currentInvoiceId.slice(0, 8)})
          </span>
        {:else}
          <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
            Unsaved Draft
          </span>
        {/if}
      </div>

      {#if toast}
        <div
          class="flex items-center gap-1.5 text-xs font-medium {toast.type === 'success'
            ? 'text-emerald-700'
            : toast.type === 'error'
              ? 'text-rose-700'
              : 'text-zinc-700'}"
        >
          <span class="h-1.5 w-1.5 rounded-full {toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'}"></span>
          <span>{toast.text}</span>
        </div>
      {/if}
    </div>
  </header>

  <!-- Mobile Tab Switcher -->
  <div class="border-b border-zinc-200 bg-white sm:hidden">
    <div class="flex">
      <button
        onclick={() => (activeTab = 'edit')}
        class="flex-1 py-3 text-center text-sm font-medium {activeTab === 'edit'
          ? 'border-b-2 border-black text-black'
          : 'text-zinc-500'}"
      >
        Edit Form
      </button>
      <button
        onclick={() => (activeTab = 'preview')}
        class="flex-1 py-3 text-center text-sm font-medium {activeTab === 'preview'
          ? 'border-b-2 border-black text-black'
          : 'text-zinc-500'}"
      >
        Live Preview
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <main class="mx-auto max-w-7xl flex-1 px-4 py-6 sm:px-6 w-full">
    <div class="flex flex-col gap-8 lg:flex-row">
      <!-- Form Panel -->
      <div class="w-full lg:w-1/2 {activeTab !== 'edit' ? 'hidden sm:block' : ''}">
        <div class="rounded-sm border border-zinc-200 bg-white p-6 shadow-xs">
          <InvoiceForm bind:invoice />
        </div>
      </div>

      <!-- Preview Panel -->
      <div class="w-full lg:w-1/2 {activeTab !== 'preview' ? 'hidden sm:block' : ''}">
        <div class="sticky top-20">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live Preview</h2>
            <button
              onclick={handleGeneratePdf}
              class="text-xs font-medium text-black underline decoration-1 underline-offset-2 hover:text-zinc-600"
            >
              Export as PDF
            </button>
          </div>
          <div class="overflow-auto rounded-sm border border-zinc-200 bg-zinc-100 p-4 shadow-xs">
            <InvoicePreview {invoice} />
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-zinc-200 bg-white py-3 text-center text-xs text-zinc-400">
    Invoice Generator with Embedded SQLite Database & WebAssembly
  </footer>

  <!-- SQLite History & Management Modal -->
  <InvoiceHistoryModal
    isOpen={isHistoryOpen}
    {currentInvoiceId}
    onClose={() => (isHistoryOpen = false)}
    onSelectInvoice={handleSelectInvoice}
    onDuplicateInvoice={handleDuplicateInvoice}
    onDatabaseMutated={refreshSavedCount}
  />
</div>
