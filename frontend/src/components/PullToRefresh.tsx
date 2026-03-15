/**
 * PullToRefresh — кастомный pull-to-refresh для iOS standalone PWA.
 * Использует нативные addEventListener с { passive: false } 
 * для корректной работы preventDefault на iOS.
 */

import { useRef, useEffect, type ReactNode } from 'react';
import './PullToRefresh.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
}

export function PullToRefresh({ onRefresh, children, threshold = 70 }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  // Обновляем ref при каждом рендере чтобы не пересоздавать listeners
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function getScrollTop() {
      return window.scrollY || document.documentElement.scrollTop || 0;
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return;
      if (getScrollTop() > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = false;
      if (indicatorRef.current) {
        indicatorRef.current.classList.remove('ptr-indicator--animating');
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (refreshingRef.current || startYRef.current === 0) return;
      if (getScrollTop() > 0) {
        startYRef.current = 0;
        return;
      }

      const diff = e.touches[0].clientY - startYRef.current;
      if (diff <= 0) return;

      // Блокируем нативный скролл чтобы не было rubber-band на iOS
      e.preventDefault();
      pullingRef.current = true;

      const distance = Math.min(diff * 0.4, threshold * 2.5);

      if (indicatorRef.current) {
        indicatorRef.current.style.height = `${distance}px`;
      }
      if (spinnerRef.current) {
        const rotation = (distance / threshold) * 360;
        spinnerRef.current.style.transform = `rotate(${rotation}deg)`;
        spinnerRef.current.style.opacity = String(Math.min(distance / threshold, 1));
      }
    }

    async function onTouchEnd() {
      if (startYRef.current === 0 || !pullingRef.current) {
        startYRef.current = 0;
        return;
      }

      const currentHeight = indicatorRef.current
        ? parseFloat(indicatorRef.current.style.height || '0')
        : 0;

      startYRef.current = 0;
      pullingRef.current = false;

      if (currentHeight >= threshold && !refreshingRef.current) {
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
          await onRefreshRef.current();
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
        // Схлопываем
        if (indicatorRef.current) {
          indicatorRef.current.classList.add('ptr-indicator--animating');
          indicatorRef.current.style.height = '0px';
        }
        if (spinnerRef.current) {
          spinnerRef.current.style.opacity = '0';
        }
      }
    }

    // { passive: false } — обязательно для iOS чтобы работал preventDefault
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [threshold]);

  return (
    <div ref={containerRef} className="pull-to-refresh">
      <div ref={indicatorRef} className="ptr-indicator">
        <div className="ptr-indicator-content">
          <div ref={spinnerRef} className="ptr-spinner" style={{ opacity: 0 }} />
        </div>
      </div>
      {children}
    </div>
  );
}
