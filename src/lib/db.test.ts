import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDatabase,
  createInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  deleteInvoice,
  exportDatabase,
  importDatabase,
  resetDatabaseInstanceForTesting,
} from './db';
import { createEmptyInvoice, DEFAULT_COLUMN_IDS, type InvoiceData } from './invoice';

describe('SQLite Database Module Unit Tests', () => {
  beforeEach(() => {
    resetDatabaseInstanceForTesting();
  });

  it('should initialize sqlite database with correct table schema', async () => {
    const db = await getDatabase();
    expect(db).toBeDefined();

    const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'");
    expect(res.length).toBe(1);
    expect(res[0].values[0][0]).toBe('invoices');
  });

  it('should create and retrieve an invoice from sqlite', async () => {
    const mockInvoice: InvoiceData = createEmptyInvoice();
    mockInvoice.invoiceNumber = 'INV-TEST-001';
    mockInvoice.from = { name: 'Acme Corp', email: 'acme@example.com', address: 'Jakarta' };
    mockInvoice.to = { name: 'Client X', email: 'clientx@example.com', address: 'Bandung' };
    mockInvoice.items[0].values[DEFAULT_COLUMN_IDS.PRICE] = 250000;
    mockInvoice.items[0].values[DEFAULT_COLUMN_IDS.QUANTITY] = 2;

    const { id } = await createInvoice(mockInvoice);
    expect(id).toBeDefined();

    const saved = await getInvoice(id);
    expect(saved).not.toBeNull();
    expect(saved?.id).toBe(id);
    expect(saved?.invoiceNumber).toBe('INV-TEST-001');
    expect(saved?.fromName).toBe('Acme Corp');
    expect(saved?.toName).toBe('Client X');
    expect(saved?.subtotal).toBe(500000);
    expect(saved?.data.invoiceNumber).toBe('INV-TEST-001');
  });

  it('should update an existing invoice in sqlite', async () => {
    const invoice = createEmptyInvoice();
    invoice.invoiceNumber = 'INV-UPDATE-001';
    invoice.to.name = 'Old Client';

    const { id } = await createInvoice(invoice);

    const updatedData: InvoiceData = JSON.parse(JSON.stringify(invoice));
    updatedData.to.name = 'New Client Updated';
    updatedData.items[0].values[DEFAULT_COLUMN_IDS.PRICE] = 120000;
    updatedData.items[0].values[DEFAULT_COLUMN_IDS.QUANTITY] = 3;

    await updateInvoice(id, updatedData);

    const record = await getInvoice(id);
    expect(record).not.toBeNull();
    expect(record?.toName).toBe('New Client Updated');
    expect(record?.subtotal).toBe(360000);
  });

  it('should delete an invoice from sqlite', async () => {
    const invoice = createEmptyInvoice();
    invoice.invoiceNumber = 'INV-DELETE-001';

    const { id } = await createInvoice(invoice);
    const before = await getInvoice(id);
    expect(before).not.toBeNull();

    await deleteInvoice(id);

    const after = await getInvoice(id);
    expect(after).toBeNull();
  });

  it('should list and search invoices with filter query', async () => {
    const inv1 = createEmptyInvoice();
    inv1.invoiceNumber = 'INV-ALPHA-101';
    inv1.to.name = 'Budi Santoso';

    const inv2 = createEmptyInvoice();
    inv2.invoiceNumber = 'INV-BETA-202';
    inv2.to.name = 'Siti Aminah';

    await createInvoice(inv1);
    await createInvoice(inv2);

    const all = await listInvoices();
    expect(all.length).toBeGreaterThanOrEqual(2);

    const searchBudi = await listInvoices('Budi');
    expect(searchBudi.length).toBe(1);
    expect(searchBudi[0].toName).toBe('Budi Santoso');

    const searchBeta = await listInvoices('BETA');
    expect(searchBeta.length).toBe(1);
    expect(searchBeta[0].invoice_number).toBe('INV-BETA-202');

    const searchNone = await listInvoices('NonExistentKeywordXYZ');
    expect(searchNone.length).toBe(0);
  });

  it('should export and import sqlite database binary correctly', async () => {
    const invoice = createEmptyInvoice();
    invoice.invoiceNumber = 'INV-BACKUP-999';
    invoice.to.name = 'Backup Client';
    await createInvoice(invoice);

    const exportedBytes = await exportDatabase();
    expect(exportedBytes).toBeInstanceOf(Uint8Array);
    expect(exportedBytes.length).toBeGreaterThan(0);

    // Reset DB instance to empty
    resetDatabaseInstanceForTesting();
    await getDatabase();
    const countBeforeImport = await listInvoices();
    expect(countBeforeImport.length).toBe(0);

    // Import exported binary
    await importDatabase(exportedBytes);
    const listAfter = await listInvoices();
    expect(listAfter.length).toBe(1);
    expect(listAfter[0].invoice_number).toBe('INV-BACKUP-999');
    expect(listAfter[0].toName).toBe('Backup Client');
  });
});
