import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePendingOps } from '../hooks/usePendingOps';
import './OfflineIndicator.css';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { pendingCount, isSyncing } = usePendingOps();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowBanner(true);
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);
  
  const isVisible = (!isOnline) || (pendingCount > 0) || showBanner;

  return (
    <>
      {isVisible && (
        <div
           className={`offline-banner ${isOnline ? (pendingCount > 0 ? 'offline-banner--syncing' : 'offline-banner--online') : 'offline-banner--offline'}`}
        >
          {!isOnline && (
            <>
              <WifiOff size={16} />
              <span>Оффлайн — данные сохранены локально</span>
            </>
          )}

          {isOnline && pendingCount > 0 && (
            <>
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Синхронизация...' : `Ожидает синхронизации: ${pendingCount}`}</span>
            </>
          )}

          {isOnline && pendingCount === 0 && showBanner && (
            <>
              <Wifi size={16} />
              <span>Подключение восстановлено</span>
            </>
          )}
        </div>
      )}
    </>
  );
}
