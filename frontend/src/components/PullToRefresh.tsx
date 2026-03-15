/**
 * PullToRefresh — универсальный компонент «потяни вниз для обновления».
 * Оборачивает содержимое страницы, перехватывает touch-события,
 * показывает индикатор и вызывает onRefresh при достижении порога.
 */

import { useRef, useCallback, type ReactNode } from 'react';
import './PullToRefresh.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  /** Порог в пикселях для срабатывания (по умолчанию 60) */
  threshold?: number;
}

export function PullToRefresh({ onRefresh, children, threshold = 60 }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const refreshingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Только если скролл наверху
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop > 0 || refreshingRef.current) return;
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = 0;
    if (indicatorRef.current) {
      indicatorRef.current.classList.remove('ptr-indicator--animating');
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === 0 || refreshingRef.current) return;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop > 0) return;

    const diff = e.touches[0].clientY - startYRef.current;
    if (diff < 0) return; // Скролл вверх — игнорируем

    // Замедление: чем дальше тянем, тем медленнее тянется
    const distance = Math.min(diff * 0.4, threshold * 2);
    currentYRef.current = distance;

    if (indicatorRef.current) {
      indicatorRef.current.style.height = `${distance}px`;
    }
    if (spinnerRef.current) {
      const rotation = (distance / threshold) * 360;
      spinnerRef.current.style.transform = `rotate(${rotation}deg)`;
      spinnerRef.current.style.opacity = String(Math.min(distance / threshold, 1));
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (startYRef.current === 0) return;
    const distance = currentYRef.current;
    startYRef.current = 0;

    if (distance >= threshold && !refreshingRef.current) {
      // Запускаем обновление
      refreshingRef.current = true;
      if (indicatorRef.current) {
        indicatorRef.current.classList.add('ptr-indicator--animating');
        indicatorRef.current.style.height = `${threshold}px`;
      }
      if (spinnerRef.current) {
        spinnerRef.current.classList.add('ptr-spinner--spinning');
      }

      try {
        await onRefresh();
      } finally {
        refreshingRef.current = false;
        if (indicatorRef.current) {
          indicatorRef.current.classList.add('ptr-indicator--animating');
          indicatorRef.current.style.height = '0px';
        }
        if (spinnerRef.current) {
          spinnerRef.current.classList.remove('ptr-spinner--spinning');
          spinnerRef.current.style.transform = '';
          spinnerRef.current.style.opacity = '0';
        }
      }
    } else {
      // Не достигли порога — схлопываем
      if (indicatorRef.current) {
        indicatorRef.current.classList.add('ptr-indicator--animating');
        indicatorRef.current.style.height = '0px';
      }
      if (spinnerRef.current) {
        spinnerRef.current.style.opacity = '0';
      }
    }
  }, [threshold, onRefresh]);

  return (
    <div
      ref={containerRef}
      className="pull-to-refresh"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={indicatorRef} className="ptr-indicator">
        <div className="ptr-indicator-content">
          <div ref={spinnerRef} className="ptr-spinner" style={{ opacity: 0 }} />
        </div>
      </div>
      {children}
    </div>
  );
}
