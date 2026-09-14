import initSqlJs, { type Database } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import type { InvoiceData } from './invoice';
import { calculateSubtotal, generateId } from './invoice';
import { loadDatabaseBinary, saveDatabaseBinary } from './storage';

export interface InvoiceSummary {
  id: string;
  invoice_number: string;
  date: string;
  dueDate: string;
  currency: string;
  fromName: string;
  toName: string;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  currency: string;
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  toName: string;
  toAddress: string;
  toEmail: string;
  notes: string;
  subtotal: number;
  data: InvoiceData;
  createdAt: string;
  updatedAt: string;
}

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

async function getWasmBinary(): Promise<ArrayBuffer | null> {
  const candidateUrls = [sqlWasmUrl, '/sql-wasm.wasm', './sql-wasm.wasm'];
  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Check WebAssembly magic header: 0x00 0x61 0x73 0x6D (\0asm)
      if (
        bytes.length >= 4 &&
        bytes[0] === 0x00 &&
        bytes[1] === 0x61 &&
        bytes[2] === 0x73 &&
        bytes[3] === 0x6d
      ) {
        return buf;
      }
    } catch {
      // Continue to next candidate URL
    }
  }
  return null;
}

async function loadSqlModule() {
  const isBrowser = typeof window !== 'undefined';

  if (isBrowser) {
    const wasmBinary = await getWasmBinary();
    if (wasmBinary) {
      return initSqlJs({ wasmBinary });
    }
    return initSqlJs({
      locateFile: () => sqlWasmUrl,
    });
  }

  try {
    const moduleName = 'node:path';
    const path = await import(/* @vite-ignore */ moduleName);
    return initSqlJs({
      locateFile: (file: string) =>
        path.resolve(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    });
  } catch {
    return initSqlJs();
  }
}

export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const SQL = await loadSqlModule();

    let savedBinary: Uint8Array | null = null;
    try {
      savedBinary = await loadDatabaseBinary();
    } catch (err) {
      console.warn('Failed to load database from storage:', err);
    }

    const db = savedBinary ? new SQL.Database(savedBinary) : new SQL.Database();
    initSchema(db);
    dbInstance = db;
    return db;
  })();

  return initPromise;
}

export function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      currency TEXT NOT NULL,
      from_name TEXT,
      from_address TEXT,
      from_email TEXT,
      to_name TEXT,
      to_address TEXT,
      to_email TEXT,
      notes TEXT,
      subtotal REAL NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_invoices_updated_at ON invoices(updated_at DESC);
  `);
}

async function persistCurrentDatabase(): Promise<void> {
  if (!dbInstance) return;
  const binary = dbInstance.export();
  await saveDatabaseBinary(binary);
}

export async function createInvoice(
  invoice: InvoiceData,
  explicitId?: string
): Promise<{ id: string }> {
  const db = await getDatabase();
  const id = explicitId || generateId();
  const now = new Date().toISOString();
  const subtotal = calculateSubtotal(invoice.items, invoice.columns);
  const dataJson = JSON.stringify(invoice);

  const stmt = db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, date, due_date, currency,
      from_name, from_address, from_email,
      to_name, to_address, to_email,
      notes, subtotal, data_json, created_at, updated_at
    ) VALUES (
      $id, $invoice_number, $date, $due_date, $currency,
      $from_name, $from_address, $from_email,
      $to_name, $to_address, $to_email,
      $notes, $subtotal, $data_json, $created_at, $updated_at
    )
  `);

  stmt.run({
    $id: id,
    $invoice_number: invoice.invoiceNumber,
    $date: invoice.date,
    $due_date: invoice.dueDate,
    $currency: invoice.currency,
    $from_name: invoice.from?.name || '',
    $from_address: invoice.from?.address || '',
    $from_email: invoice.from?.email || '',
    $to_name: invoice.to?.name || '',
    $to_address: invoice.to?.address || '',
    $to_email: invoice.to?.email || '',
    $notes: invoice.notes || '',
    $subtotal: subtotal,
    $data_json: dataJson,
    $created_at: now,
    $updated_at: now,
  });
  stmt.free();

  await persistCurrentDatabase();
  return { id };
}

export async function updateInvoice(id: string, invoice: InvoiceData): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const subtotal = calculateSubtotal(invoice.items, invoice.columns);
  const dataJson = JSON.stringify(invoice);

  const stmt = db.prepare(`
    UPDATE invoices SET
      invoice_number = $invoice_number,
      date = $date,
      due_date = $due_date,
      currency = $currency,
      from_name = $from_name,
      from_address = $from_address,
      from_email = $from_email,
      to_name = $to_name,
      to_address = $to_address,
      to_email = $to_email,
      notes = $notes,
      subtotal = $subtotal,
      data_json = $data_json,
      updated_at = $updated_at
    WHERE id = $id
  `);

  stmt.run({
    $id: id,
    $invoice_number: invoice.invoiceNumber,
    $date: invoice.date,
    $due_date: invoice.dueDate,
    $currency: invoice.currency,
    $from_name: invoice.from?.name || '',
    $from_address: invoice.from?.address || '',
    $from_email: invoice.from?.email || '',
    $to_name: invoice.to?.name || '',
    $to_address: invoice.to?.address || '',
    $to_email: invoice.to?.email || '',
    $notes: invoice.notes || '',
    $subtotal: subtotal,
    $data_json: dataJson,
    $updated_at: now,
  });
  stmt.free();

  await persistCurrentDatabase();
}

export async function getInvoice(id: string): Promise<InvoiceRecord | null> {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT
      id, invoice_number, date, due_date, currency,
      from_name, from_address, from_email,
      to_name, to_address, to_email,
      notes, subtotal, data_json, created_at, updated_at
    FROM invoices
    WHERE id = $id
  `);

  stmt.bind({ $id: id });
  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const row = stmt.getAsObject() as Record<string, unknown>;
  stmt.free();

  let parsedData: InvoiceData;
  try {
    parsedData = JSON.parse(row.data_json as string);
  } catch (err) {
    console.error('Failed to parse invoice JSON:', err);
    return null;
  }

  return {
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    date: row.date as string,
    dueDate: row.due_date as string,
    currency: row.currency as string,
    fromName: (row.from_name as string) || '',
    fromAddress: (row.from_address as string) || '',
    fromEmail: (row.from_email as string) || '',
    toName: (row.to_name as string) || '',
    toAddress: (row.to_address as string) || '',
    toEmail: (row.to_email as string) || '',
    notes: (row.notes as string) || '',
    subtotal: Number(row.subtotal || 0),
    data: parsedData,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listInvoices(searchQuery?: string): Promise<InvoiceSummary[]> {
  const db = await getDatabase();
  let sql = `
    SELECT
      id, invoice_number, date, due_date, currency,
      from_name, to_name, subtotal, created_at, updated_at
    FROM invoices
  `;
  const params: Record<string, string> = {};

  if (searchQuery && searchQuery.trim().length > 0) {
    sql += `
      WHERE invoice_number LIKE $query
         OR to_name LIKE $query
         OR from_name LIKE $query
    `;
    params['$query'] = `%${searchQuery.trim()}%`;
  }

  sql += ` ORDER BY updated_at DESC`;

  const stmt = db.prepare(sql);
  stmt.bind(params);

  const results: InvoiceSummary[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    results.push({
      id: row.id as string,
      invoice_number: row.invoice_number as string,
      date: row.date as string,
      dueDate: row.due_date as string,
      currency: row.currency as string,
      fromName: (row.from_name as string) || '',
      toName: (row.to_name as string) || '',
      subtotal: Number(row.subtotal || 0),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    });
  }
  stmt.free();

  return results;
}

export async function deleteInvoice(id: string): Promise<void> {
  const db = await getDatabase();
  const stmt = db.prepare(`DELETE FROM invoices WHERE id = $id`);
  stmt.run({ $id: id });
  stmt.free();

  await persistCurrentDatabase();
}

export async function exportDatabase(): Promise<Uint8Array> {
  const db = await getDatabase();
  return db.export();
}

export async function importDatabase(data: Uint8Array): Promise<void> {
  const SQL = await loadSqlModule();

  const newDb = new SQL.Database(data);
  initSchema(newDb);

  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = newDb;
  await persistCurrentDatabase();
}

export function resetDatabaseInstanceForTesting(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  initPromise = null;
}
