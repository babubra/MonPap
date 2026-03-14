import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <AnimatePresence>
      {isVisible && (
        <motion.div
           className={`offline-banner ${isOnline ? (pendingCount > 0 ? 'offline-banner--syncing' : 'offline-banner--online') : 'offline-banner--offline'}`}
           initial={{ y: -50, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: -50, opacity: 0 }}
           transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
