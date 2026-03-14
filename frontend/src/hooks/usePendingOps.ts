import { useState, useEffect } from 'react';
import { countPendingOps } from '../lib/offlineDb';

export function usePendingOps() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function updateCount() {
      const count = await countPendingOps();
      setPendingCount(count);
    }
    
    updateCount();

    function handleOpsChanged() {
      updateCount();
    }
    
    function handleSyncStart() { setIsSyncing(true); }
    function handleSyncFinish() { setIsSyncing(false); }

    window.addEventListener('pendingOpsChanged', handleOpsChanged);
    window.addEventListener('syncStarted', handleSyncStart);
    window.addEventListener('syncFinished', handleSyncFinish);
    
    return () => {
      window.removeEventListener('pendingOpsChanged', handleOpsChanged);
      window.removeEventListener('syncStarted', handleSyncStart);
      window.removeEventListener('syncFinished', handleSyncFinish);
    };
  }, []);

  return { pendingCount, isSyncing };
}
