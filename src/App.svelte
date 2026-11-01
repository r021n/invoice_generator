<script lang="ts">
  import { onMount } from 'svelte';
  import InvoiceForm from './lib/InvoiceForm.svelte';
  import InvoicePreview from './lib/InvoicePreview.svelte';
  import InvoiceHistoryModal from './lib/InvoiceHistoryModal.svelte';
  import { createEmptyInvoice } from './lib/invoice';
  import { generatePdf } from './lib/generatePdf';
  import { createInvoice, updateInvoice, listInvoices, getDatabase } from './lib/db';
  import type { InvoiceData, InvoiceItem } from './lib/invoice';

  let invoice = $state<InvoiceData>(createEmptyInvoice());
  let currentInvoiceId = $state<string | null>(null);
  let activeTab = $state<'edit' | 'preview'>('edit');
  let isHistoryOpen = $state(false);
  let savedCount = $state(0);

  // Status Auto-save
  type SaveStatus = 'saved' | 'saving' | 'unsaved';
  let saveStatus = $state<SaveStatus>('saved');
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let isInitialLoad = $state(true);
  let lastSavedSnapshot = $state<string>('');

  // Undo Item Terhapus
  let lastDeleted = $state<{ item: InvoiceItem; index: number } | null>(null);

  // Toast Notifikasi
  let toast = $state<{
    text: string;
    type: 'success' | 'error' | 'info';
    action?: { label: string; run: () => void };
  } | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function showToast(
    text: string,
    type: 'success' | 'error' | 'info' = 'success',
    action?: { label: string; run: () => void }
  ) {
    if (toastTimer) clearTimeout(toastTimer);
    toast = { text, type, action };
    toastTimer = setTimeout(() => {
      toast = null;
    }, action ? 6000 : 3500);
  }

  async function refreshSavedCount() {
    try {
      const items = await listInvoices();
      savedCount = items.length;
    } catch (err) {
      console.error('Gagal mengambil jumlah faktur:', err);
    }
  }

  onMount(() => {
    getDatabase()
      .then(() => refreshSavedCount())
      .catch((err) => console.error('Inisialisasi database gagal:', err));

    lastSavedSnapshot = JSON.stringify(invoice);
    setTimeout(() => {
      isInitialLoad = false;
    }, 300);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });

  async function performSave(): Promise<string | null> {
    saveStatus = 'saving';
    try {
      if (currentInvoiceId) {
        await updateInvoice(currentInvoiceId, invoice);
      } else {
        const res = await createInvoice(invoice);
        currentInvoiceId = res.id;
      }
      lastSavedSnapshot = JSON.stringify(invoice);
      saveStatus = 'saved';
      await refreshSavedCount();
      return currentInvoiceId;
    } catch (err) {
      console.error('Auto-save gagal:', err);
      saveStatus = 'unsaved';
      return null;
    }
  }

  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    saveStatus = 'unsaved';
    autoSaveTimer = setTimeout(() => {
      performSave();
    }, 1200);
  }

  $effect(() => {
    // Pantau perubahan pada invoice untuk auto-save reaktif
    const current = JSON.stringify(invoice);
    if (!isInitialLoad && current !== lastSavedSnapshot) {
      scheduleAutoSave();
    }
  });

  async function handleGeneratePdf() {
    // Sinkronkan ke database terlebih dahulu sebelum PDF diekspor
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    if (saveStatus !== 'saved') {
      await performSave();
    }
    generatePdf(invoice);
    showToast('Faktur berhasil diunduh dan otomatis tersimpan', 'success');
  }

  async function handleNewInvoice() {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    if (saveStatus === 'unsaved') {
      await performSave();
    }
    invoice = createEmptyInvoice();
    currentInvoiceId = null;
    lastSavedSnapshot = JSON.stringify(invoice);
    saveStatus = 'saved';
    showToast('Draf faktur baru siap diisi', 'info');
  }

  function handleSelectInvoice(selected: InvoiceData, id: string) {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    invoice = selected;
    currentInvoiceId = id;
    lastSavedSnapshot = JSON.stringify(selected);
    saveStatus = 'saved';
    showToast(`Faktur ${selected.invoiceNumber} berhasil dibuka`, 'info');
  }

  function handleDuplicateInvoice(duplicated: InvoiceData) {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    invoice = duplicated;
    currentInvoiceId = null;
    lastSavedSnapshot = JSON.stringify(duplicated);
    saveStatus = 'saved';
    showToast(`Faktur disalin sebagai draf baru: ${duplicated.invoiceNumber}`, 'info');
    performSave();
  }

  async function handleSaveAsNew() {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    saveStatus = 'saving';
    try {
      const copy: InvoiceData = JSON.parse(JSON.stringify(invoice));
      copy.invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      invoice.invoiceNumber = copy.invoiceNumber;
      const res = await createInvoice(copy);
      currentInvoiceId = res.id;
      lastSavedSnapshot = JSON.stringify(invoice);
      saveStatus = 'saved';
      showToast(`Tersimpan sebagai salinan baru: ${copy.invoiceNumber}`, 'success');
      await refreshSavedCount();
    } catch (err) {
      console.error(err);
      saveStatus = 'unsaved';
      showToast('Gagal membuat salinan faktur', 'error');
    }
  }

  function handleItemRemoved(item: InvoiceItem, index: number) {
    lastDeleted = { item, index };
    showToast('Baris item dihapus', 'info', {
      label: 'Urungkan (Undo)',
      run: () => {
        if (lastDeleted) {
          const items = [...invoice.items];
          items.splice(lastDeleted.index, 0, lastDeleted.item);
          invoice.items = items;
          lastDeleted = null;
          showToast('Baris item berhasil dikembalikan', 'success');
        }
      },
    });
  }
</script>

<div class="min-h-screen bg-zinc-50 flex flex-col">
  <!-- Navigasi Atas / Header -->
  <header class="border-b border-zinc-200 bg-white sticky top-0 z-30 shadow-xs">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
      <div class="flex items-center gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold tracking-tight text-zinc-900">Generator Faktur</h1>
          </div>
          <p class="text-xs text-zinc-500">Buat, simpan otomatis, dan unduh faktur dengan mudah</p>
        </div>
      </div>

      <!-- Tombol Aksi Utama -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={handleNewInvoice}
          class="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition"
          title="Buat draf faktur kosong baru"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Faktur Baru</span>
        </button>

        <button
          type="button"
          onclick={() => (isHistoryOpen = true)}
          class="relative inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition"
          title="Buka daftar riwayat faktur tersimpan"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Riwayat</span>
          {#if savedCount > 0}
            <span class="ml-0.5 rounded-full bg-zinc-900 px-1.5 py-0.5 text-xs font-bold text-white">
              {savedCount}
            </span>
          {/if}
        </button>

        {#if currentInvoiceId}
          <button
            type="button"
            onclick={handleSaveAsNew}
            class="hidden md:inline-flex items-center gap-1 rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
            title="Simpan perubahan sebagai salinan faktur baru"
          >
            Salin Jadi Baru
          </button>
        {/if}

        <!-- Tombol Primer Ekspor PDF -->
        <button
          type="button"
          onclick={handleGeneratePdf}
          class="inline-flex items-center gap-1.5 rounded bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 active:bg-zinc-950 transition shadow-xs"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Unduh PDF</span>
        </button>
      </div>
    </div>

    <!-- Status Bar Dokumen Aktif & Indikator Auto-Save -->
    <div class="border-t border-zinc-100 bg-zinc-50/80 px-4 py-1.5 text-xs sm:px-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-zinc-500">Dokumen Aktif:</span>
        <span class="font-mono font-semibold text-zinc-900">{invoice.invoiceNumber}</span>

        <!-- Indikator Auto-Save Humanis -->
        {#if saveStatus === 'saving'}
          <span class="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            <span class="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Menyimpan...
          </span>
        {:else if saveStatus === 'saved'}
          <span class="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Tersimpan otomatis
          </span>
        {:else}
          <span class="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Ada perubahan belum tersimpan
          </span>
        {/if}
      </div>

      <!-- Notifikasi Toast & Tombol Undo -->
      {#if toast}
        <div
          class="flex items-center gap-2 text-xs font-medium {toast.type === 'success'
            ? 'text-emerald-700'
            : toast.type === 'error'
              ? 'text-rose-700'
              : 'text-zinc-800'}"
        >
          <span>{toast.text}</span>
          {#if toast.action}
            <button
              type="button"
              onclick={toast.action.run}
              class="font-bold underline decoration-1 underline-offset-2 hover:text-black transition"
            >
              {toast.action.label}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </header>

  <!-- Pengalih Tab Tampilan Mobile -->
  <div class="border-b border-zinc-200 bg-white sm:hidden">
    <div class="flex">
      <button
        onclick={() => (activeTab = 'edit')}
        class="flex-1 py-3 text-center text-sm font-semibold {activeTab === 'edit'
          ? 'border-b-2 border-black text-black'
          : 'text-zinc-500'}"
      >
        Formulir Faktur
      </button>
      <button
        onclick={() => (activeTab = 'preview')}
        class="flex-1 py-3 text-center text-sm font-semibold {activeTab === 'preview'
          ? 'border-b-2 border-black text-black'
          : 'text-zinc-500'}"
      >
        Pratinjau Langsung
      </button>
    </div>
  </div>

  <!-- Konten Utama -->
  <main class="mx-auto max-w-7xl flex-1 px-4 py-6 sm:px-6 w-full">
    <div class="flex flex-col gap-8 lg:flex-row">
      <!-- Panel Formulir Input -->
      <div class="w-full lg:w-1/2 {activeTab !== 'edit' ? 'hidden sm:block' : ''}">
        <div class="rounded-sm border border-zinc-200 bg-white p-6 shadow-xs">
          <InvoiceForm bind:invoice onItemRemoved={handleItemRemoved} />
        </div>
      </div>

      <!-- Panel Pratinjau Faktur -->
      <div class="w-full lg:w-1/2 {activeTab !== 'preview' ? 'hidden sm:block' : ''}">
        <div class="sticky top-20">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-500">Pratinjau Langsung</h2>
            <button
              onclick={handleGeneratePdf}
              class="text-xs font-semibold text-zinc-900 underline decoration-1 underline-offset-2 hover:text-zinc-600 transition"
            >
              Ekspor sebagai PDF
            </button>
          </div>
          <div class="overflow-auto rounded-sm border border-zinc-200 bg-zinc-100 p-4 shadow-xs">
            <InvoicePreview {invoice} />
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer Bersih -->
  <footer class="border-t border-zinc-200 bg-white py-3 text-center text-xs text-zinc-500">
    Generator Faktur • Data Anda tersimpan secara lokal dan aman di browser
  </footer>

  <!-- Modal Riwayat Faktur -->
  <InvoiceHistoryModal
    isOpen={isHistoryOpen}
    {currentInvoiceId}
    onClose={() => (isHistoryOpen = false)}
    onSelectInvoice={handleSelectInvoice}
    onDuplicateInvoice={handleDuplicateInvoice}
    onDatabaseMutated={refreshSavedCount}
  />
</div>
