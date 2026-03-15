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
  pending_ops: {
    key: number;
    value: PendingOp;
  };
}

let dbPromise: Promise<IDBPDatabase<MonPapDB>> | null = null;

export async function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<MonPapDB>('monpap_offline', 2, {
      upgrade(db) {
        // Удаляем старые кэш-сторы если они есть (миграция)
        for (const name of ['categories', 'counterparts', 'transactions', 'debts', 'settings'] as const) {
          if (db.objectStoreNames.contains(name as never)) {
            db.deleteObjectStore(name as never);
          }
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
  const tx = db.transaction('pending_ops', 'readwrite');
  await tx.objectStore('pending_ops').clear();
  await tx.done;
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
