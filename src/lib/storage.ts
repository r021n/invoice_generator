const DB_NAME = 'invoice_generator_storage';
const STORE_NAME = 'sqlite_data';
const KEY = 'database.sqlite';

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDatabaseBinary(data: Uint8Array): Promise<void> {
  const db = await openIndexedDb();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(data, KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function loadDatabaseBinary(): Promise<Uint8Array | null> {
  const db = await openIndexedDb();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY);

      request.onsuccess = () => {
        const result = request.result;
        if (result instanceof Uint8Array) {
          resolve(result);
        } else if (result instanceof ArrayBuffer) {
          resolve(new Uint8Array(result));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function clearDatabaseBinary(): Promise<void> {
  const db = await openIndexedDb();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}
