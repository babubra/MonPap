/**
 * useShowAmounts — глобальный хук для скрытия/показа сумм.
 * Значение хранится в localStorage и синхронизируется между вкладками.
 */

import { useState, useEffect, useCallback } from 'react';

const KEY = 'monpap_show_amounts';

function readStorage(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

export function useShowAmounts() {
  const [showAmounts, setShowAmountsState] = useState<boolean>(readStorage);

  // Слушаем изменения из других вкладок / компонентов через storage-событие
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) {
        setShowAmountsState(e.newValue === 'true');
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleShowAmounts = useCallback(() => {
    setShowAmountsState((prev) => {
      const next = !prev;
      localStorage.setItem(KEY, String(next));
      // Генерируем событие чтобы другие экземпляры хука обновились в той же вкладке
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: String(next) }));
      return next;
    });
  }, []);

  const formatAmount = useCallback(
    (val: string | number): string => {
      if (!showAmounts) return '• • •';
      return Number(val).toLocaleString('ru-RU');
    },
    [showAmounts]
  );

  return { showAmounts, toggleShowAmounts, formatAmount };
}
