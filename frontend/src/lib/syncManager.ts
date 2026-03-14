import { getPendingOps, removePendingOp } from './offlineDb';
import { getToken } from '../api'; // Need to be careful about circular deps, or just fetch directly using raw fetch

const API_BASE = '/api';

export class SyncManager {
  private isSyncing = false;
  private intervalId: number | null = null;

  constructor() {
    // Listen for online events
    window.addEventListener('online', this.handleOnline);
    // Periodically check queue when online
    this.intervalId = window.setInterval(() => this.sync(), 10000);
  }

  destroy() {
    window.removeEventListener('online', this.handleOnline);
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private handleOnline = () => {
    this.sync();
  };

  async sync() {
    if (this.isSyncing) return;
    if (!navigator.onLine) return;

    this.isSyncing = true;
    window.dispatchEvent(new Event('syncStarted'));
    
    try {
      const ops = await getPendingOps();
      if (ops.length === 0) {
        return; // Nothing to sync
      }

      const token = getToken();
      if (!token) {
        console.warn('Cannot sync without auth token');
        return;
      }

      for (const op of ops) {
        if (!op.id) continue;
        
        try {
            const url = `${API_BASE}${op.endpoint}`;
            const options: RequestInit = {
                method: op.method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            if (op.payload && op.method !== 'DELETE') {
                options.body = JSON.stringify(op.payload);
            }

            const response = await fetch(url, options);
            
            // If success (2xx) or 400+ bad request (means payload is invalid and won't be fixed by retries)
            // we remove it from queue. If 5xx or Network Error, fetch throws/fails, we keep it in queue.
            if (response.ok || (response.status >= 400 && response.status < 500)) {
                await removePendingOp(op.id);
            } else {
                 console.warn(`Sync failed for op ${op.id} with status ${response.status}. Retrying later.`);
                 break; // Stop syncing and retry later to maintain order
            }
        } catch (error) {
             console.error(`Sync network error for op ${op.id}:`, error);
             break; // Stop syncing on network error
        }
      }
    } finally {
      this.isSyncing = false;
      window.dispatchEvent(new Event('syncFinished'));
    }
  }
}

// Singleton instance
export const syncManager = new SyncManager();
