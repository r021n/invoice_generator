import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDatabase,
  createInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  deleteInvoice,
  exportDatabase,
  resetDatabaseInstanceForTesting,
} from './db';
import {
  createEmptyInvoice,
  DEFAULT_COLUMN_IDS,
  calculateSubtotal,
  type InvoiceData,
} from './invoice';

describe('Invoice SQLite End-to-End Integration Tests', () => {
  beforeEach(() => {
    resetDatabaseInstanceForTesting();
  });

  it('should complete full invoice CRUD lifecycle with data integrity', async () => {
    // 1. Initial State: Empty DB
    await getDatabase();
    let list = await listInvoices();
    expect(list).toEqual([]);

    // 2. CREATE: User creates a new invoice
    const newInvoice: InvoiceData = createEmptyInvoice();
    newInvoice.invoiceNumber = 'INV-2026-001';
    newInvoice.date = '2026-09-14';
    newInvoice.dueDate = '2026-10-14';
    newInvoice.currency = 'USD';
    newInvoice.from = {
      name: 'Freelance Studio Inc',
      address: 'Sudirman Central Business District',
      email: 'finance@freelancestudio.com',
    };
    newInvoice.to = {
      name: 'Global Tech Ltd',
      address: 'Singapore One Raffles Place',
      email: 'accounts@globaltech.sg',
    };
    newInvoice.items = [
      {
        id: 'item-1',
        values: {
          [DEFAULT_COLUMN_IDS.DESCRIPTION]: 'Frontend Development with Svelte 5',
          [DEFAULT_COLUMN_IDS.QUANTITY]: 40,
          [DEFAULT_COLUMN_IDS.PRICE]: 50,
        },
      },
      {
        id: 'item-2',
        values: {
          [DEFAULT_COLUMN_IDS.DESCRIPTION]: 'SQLite WASM Database Integration',
          [DEFAULT_COLUMN_IDS.QUANTITY]: 20,
          [DEFAULT_COLUMN_IDS.PRICE]: 75,
        },
      },
    ];
    newInvoice.notes = 'Payment due within 30 days via Wire Transfer.';

    const expectedSubtotal = calculateSubtotal(newInvoice.items, newInvoice.columns);
    expect(expectedSubtotal).toBe(40 * 50 + 20 * 75); // 2000 + 1500 = 3500

    const { id } = await createInvoice(newInvoice);
    expect(id).toBeTruthy();

    // 3. READ LIST: History list should now contain 1 invoice
    list = await listInvoices();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(id);
    expect(list[0].invoice_number).toBe('INV-2026-001');
    expect(list[0].toName).toBe('Global Tech Ltd');
    expect(list[0].subtotal).toBe(3500);

    // 4. READ SINGLE: Get full details
    const loadedRecord = await getInvoice(id);
    expect(loadedRecord).not.toBeNull();
    expect(loadedRecord!.data.items.length).toBe(2);
    expect(loadedRecord!.data.notes).toBe(newInvoice.notes);

    // 5. UPDATE: User edits the invoice (adds a 3rd item and updates notes)
    const modifiedData: InvoiceData = JSON.parse(JSON.stringify(loadedRecord!.data));
    modifiedData.items.push({
      id: 'item-3',
      values: {
        [DEFAULT_COLUMN_IDS.DESCRIPTION]: 'Automated Test Suite & CI setup',
        [DEFAULT_COLUMN_IDS.QUANTITY]: 10,
        [DEFAULT_COLUMN_IDS.PRICE]: 60,
      },
    });
    modifiedData.notes = 'Payment updated: Swift code provided.';

    await updateInvoice(id, modifiedData);

    // Verify updated record in SQLite
    const updatedRecord = await getInvoice(id);
    expect(updatedRecord).not.toBeNull();
    expect(updatedRecord!.subtotal).toBe(3500 + 600); // 4100
    expect(updatedRecord!.notes).toBe('Payment updated: Swift code provided.');
    expect(updatedRecord!.data.items.length).toBe(3);

    // 6. CLONE / DUPLICATE: User clones invoice as a new invoice
    const clonedData: InvoiceData = JSON.parse(JSON.stringify(updatedRecord!.data));
    clonedData.invoiceNumber = 'INV-2026-002';
    const { id: cloneId } = await createInvoice(clonedData);

    list = await listInvoices();
    expect(list.length).toBe(2);

    // 7. DELETE: User deletes the original invoice
    await deleteInvoice(id);

    const deletedRecord = await getInvoice(id);
    expect(deletedRecord).toBeNull();

    // Only cloned invoice remains
    list = await listInvoices();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(cloneId);
    expect(list[0].invoice_number).toBe('INV-2026-002');

    // 8. EXPORT: Verify SQLite binary can be generated
    const backup = await exportDatabase();
    expect(backup.byteLength).toBeGreaterThan(0);
  });
});
