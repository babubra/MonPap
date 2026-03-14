import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

export interface PendingOp {
  id?: number; // Auto-increment key in IDB
  method: 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  payload?: unknown;
  createdAt: number;
}

interface MonPapDB extends DBSchema {
  categories: {
    key: number;
    value: unknown;
  };
  counterparts: {
    key: number;
    value: unknown;
  };
  transactions: {
    key: number;
    value: unknown;
    indexes: { 'by-date': string };
  };
  debts: {
    key: number;
    value: unknown;
  };
  settings: {
    key: string;
    value: unknown;
  };
  pending_ops: {
    key: number;
    value: PendingOp;
  };
}

let dbPromise: Promise<IDBPDatabase<MonPapDB>> | null = null;

export async function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<MonPapDB>('monpap_offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('counterparts')) {
          db.createObjectStore('counterparts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.createIndex('by-date', 'transaction_date');
        }
        if (!db.objectStoreNames.contains('debts')) {
          db.createObjectStore('debts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings'); 
        }
        if (!db.objectStoreNames.contains('pending_ops')) {
          db.createObjectStore('pending_ops', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function clearDB() {
  const db = await initDB();
  const tx = db.transaction(
    ['categories', 'counterparts', 'transactions', 'debts', 'settings', 'pending_ops'],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('categories').clear(),
    tx.objectStore('counterparts').clear(),
    tx.objectStore('transactions').clear(),
    tx.objectStore('debts').clear(),
    tx.objectStore('settings').clear(),
    tx.objectStore('pending_ops').clear(),
  ]);
  await tx.done;
}

// === Caching GET endpoints ===

export async function setCache(storeName: 'categories' | 'counterparts' | 'transactions' | 'debts', data: unknown[]) {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  
  if (storeName === 'categories' || storeName === 'counterparts') {
    await store.clear();
  } else if (storeName === 'debts') {
    // Usually debts are fetched all together, so clearing is mostly safe, but let's just overwrite existing
    // Actually, getting debts fetches all active debts. If it's closed, it might disappear from GET /debts
    // Let's clear debts too if we assume it's a full fetch.
    await store.clear();
  }
  
  for (const item of data) {
    await store.put(item);
  }
  await tx.done;
}

export async function getCache(storeName: 'categories' | 'counterparts' | 'transactions' | 'debts') : Promise<unknown[]> {
  const db = await initDB();
  return db.getAll(storeName);
}

export async function setSettingsCache(settings: unknown) {
  const db = await initDB();
  await db.put('settings', settings, 'user_settings');
}

export async function getSettingsCache() : Promise<unknown> {
    const db = await initDB();
    return db.get('settings', 'user_settings');
}

// === Pending Operations Queue ===

export async function addPendingOp(op: Omit<PendingOp, 'id' | 'createdAt'>): Promise<number> {
  const db = await initDB();
  const fullOp: PendingOp = {
    ...op,
    createdAt: Date.now(),
  };
  // Trigger custom event to update UI instantly about pending ops
  const id = await db.add('pending_ops', fullOp);
  window.dispatchEvent(new Event('pendingOpsChanged'));
  return id;
}

export async function getPendingOps(): Promise<PendingOp[]> {
  const db = await initDB();
  return db.getAll('pending_ops');
}

export async function countPendingOps(): Promise<number> {
  const db = await initDB();
  const ops = await db.getAll('pending_ops');
  return ops.length;
}

export async function removePendingOp(id: number) {
  const db = await initDB();
  await db.delete('pending_ops', id);
  window.dispatchEvent(new Event('pendingOpsChanged'));
}
