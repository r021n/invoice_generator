<script lang="ts">
  import InvoiceForm from './lib/InvoiceForm.svelte';
  import InvoicePreview from './lib/InvoicePreview.svelte';
  import { createEmptyInvoice } from './lib/invoice';
  import { generatePdf } from './lib/generatePdf';
  import type { InvoiceData } from './lib/invoice';

  let invoice = $state<InvoiceData>(createEmptyInvoice());
  let activeTab = $state<'edit' | 'preview'>('edit');

  function handleGeneratePdf() {
    generatePdf(invoice);
  }
</script>

<div class="min-h-screen bg-zinc-50">
  <!-- Header -->
  <header class="border-b border-zinc-200 bg-white">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
      <div>
        <h1 class="text-xl font-bold tracking-tight">Invoice Generator</h1>
        <p class="text-sm text-zinc-500">Create and export professional invoices</p>
      </div>
      <button
        onclick={handleGeneratePdf}
        class="bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 active:bg-zinc-900"
      >
        Download PDF
      </button>
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
        Edit
      </button>
      <button
        onclick={() => (activeTab = 'preview')}
        class="flex-1 py-3 text-center text-sm font-medium {activeTab === 'preview'
          ? 'border-b-2 border-black text-black'
          : 'text-zinc-500'}"
      >
        Preview
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <div class="flex flex-col gap-8 lg:flex-row">
      <!-- Form Panel -->
      <div class="w-full lg:w-1/2 {activeTab !== 'edit' ? 'hidden sm:block' : ''}">
        <div class="rounded-sm border border-zinc-200 bg-white p-6">
          <InvoiceForm bind:invoice />
        </div>
      </div>

      <!-- Preview Panel -->
      <div class="w-full lg:w-1/2 {activeTab !== 'preview' ? 'hidden sm:block' : ''}">
        <div class="sticky top-8">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-zinc-500">Preview</h2>
            <button
              onclick={handleGeneratePdf}
              class="text-sm font-medium text-black underline decoration-1 underline-offset-2 hover:text-zinc-600"
            >
              Export as PDF
            </button>
          </div>
          <div class="overflow-auto rounded-sm border border-zinc-200 bg-zinc-100 p-4">
            <InvoicePreview {invoice} />
          </div>
        </div>
      </div>
    </div>
  </main>
</div>
