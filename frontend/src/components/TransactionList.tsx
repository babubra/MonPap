/**
 * TransactionList — общий компонент списка транзакций.
 * Используется на страницах Income и Expenses.
 *
 * Режимы периода: Месяц | Год | 90д | Всё | Диапазон
 * Фильтр по категории
 *
 * Поведение клика по карточке:
 *   1-й клик → карточка разворачивается (полный комментарий)
 *   2-й клик → открывается шторка редактирования
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react';
import { transactions as txApi, categories as catApi, type Transaction, type Category } from '../api';
import { TransactionDetailsSheet } from './TransactionDetailsSheet';
import { useShowAmounts } from '../hooks/useShowAmounts';
import './TransactionList.css';

/** Режимы периода */
type PeriodMode = 'month' | 'year' | 'days90' | 'all' | 'range';

const PERIOD_LABELS: Record<PeriodMode, string> = {
  month: 'Месяц',
  year: 'Год',
  days90: '90 дней',
  all: 'Всё',
  range: 'Диапазон',
};

/** Группирует транзакции по дате, возвращает отсортированный массив групп. */
function groupByDate(items: Transaction[]): { date: string; label: string; items: Transaction[] }[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const fmtKey = (d: Date) => d.toISOString().split('T')[0];
  const todayKey = fmtKey(today);
  const yesterdayKey = fmtKey(yesterday);

  const map = new Map<string, Transaction[]>();
  for (const tx of items) {
    const key = tx.transaction_date.split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }

  return Array.from(map.entries()).map(([date, txs]) => {
    let label: string;
    if (date === todayKey) label = 'Сегодня';
    else if (date === yesterdayKey) label = 'Вчера';
    else label = new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return { date, label, items: txs };
  });
}

/** Вычисляет date_from/date_to по режиму. */
function getPeriodDates(
  mode: PeriodMode,
  year: number,
  month: number,
  rangeFrom: string,
  rangeTo: string,
): { date_from?: string; date_to?: string; year?: number; month?: number } {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  switch (mode) {
    case 'month':
      return { year, month };
    case 'year':
      return { year };
    case 'days90': {
      const from = new Date(today);
      from.setDate(today.getDate() - 89);
      return { date_from: from.toISOString().split('T')[0], date_to: todayStr };
    }
    case 'all':
      return {};
    case 'range':
      return {
        date_from: rangeFrom || undefined,
        date_to: rangeTo || undefined,
      };
    default:
      return { year, month };
  }
}

interface TransactionListProps {
  type?: 'income' | 'expense';
}

export function TransactionList({ type }: TransactionListProps) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<number | null>(null);
  const { formatAmount } = useShowAmounts();

  // Период
  const now = new Date();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  // Категории
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [catDropOpen, setCatDropOpen] = useState(false);

  // Загружаем категории один раз
  useEffect(() => {
    catApi.list(type).then(setCategories).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const periodParams = getPeriodDates(periodMode, year, month, rangeFrom, rangeTo);
      const data = await txApi.list({
        type: type || undefined,
        ...periodParams,
        category_id: selectedCatId ?? undefined,
        search: search || undefined,
        limit: 500,
      });
      setItems(data);
    } catch {
      // оффлайн
    } finally {
      setLoading(false);
    }
  }, [type, periodMode, year, month, rangeFrom, rangeTo, selectedCatId, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Навигация по месяцу
  function prevMonth() {
    setExpandedTxId(null);
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    setExpandedTxId(null);
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Навигация по году
  function prevYear() { setExpandedTxId(null); setYear(y => y - 1); }
  function nextYear() { setExpandedTxId(null); setYear(y => y + 1); }

  function handleModeChange(mode: PeriodMode) {
    setPeriodMode(mode);
    setExpandedTxId(null);
    setCatDropOpen(false);
  }

  /** 1-й клик — раскрыть; 2-й клик на раскрытую — открыть шторку. */
  function handleTxClick(tx: Transaction) {
    if (expandedTxId === tx.id) {
      setExpandedTxId(null);
      setSelectedTx(tx);
    } else {
      setExpandedTxId(tx.id);
    }
  }

  function handleUpdatedTx(updatedTx: Transaction) {
    setItems((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
    setSelectedTx((prev) => (prev?.id === updatedTx.id ? updatedTx : prev));
  }

  function handleDeletedTx(id: number) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Заголовок периода ──────────────────────────────────────────
  const periodLabel = (() => {
    if (periodMode === 'month') {
      return new Date(year, month - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    }
    if (periodMode === 'year') return `${year} год`;
    if (periodMode === 'days90') return 'Последние 90 дней';
    if (periodMode === 'all') return 'Все время';
    if (periodMode === 'range') {
      const f = rangeFrom ? new Date(rangeFrom).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '?';
      const t = rangeTo ? new Date(rangeTo).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '?';
      return `${f} — ${t}`;
    }
    return '';
  })();

  const total = items.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const selectedCat = categories.find(c => c.id === selectedCatId) || null;

  return (
    <>
      {/* ── Переключатель режима периода ────────────────────────── */}
      <div className="tx-period-pills">
        {(Object.keys(PERIOD_LABELS) as PeriodMode[]).map((mode) => (
          <button
            key={mode}
            className={`tx-period-pill ${periodMode === mode ? 'active' : ''}`}
            onClick={() => handleModeChange(mode)}
          >
            {PERIOD_LABELS[mode]}
          </button>
        ))}
      </div>

      {/* ── Навигация по месяцу/году ─────────────────────────────── */}
      {(periodMode === 'month' || periodMode === 'year') && (
        <div className="tx-nav-row">
          <button
            className="tx-nav-btn"
            onClick={periodMode === 'month' ? prevMonth : prevYear}
            aria-label="Назад"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="tx-period-label">{periodLabel}</span>
          <button
            className="tx-nav-btn"
            onClick={periodMode === 'month' ? nextMonth : nextYear}
            aria-label="Вперёд"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Статичная метка для других режимов */}
      {periodMode !== 'month' && periodMode !== 'year' && periodMode !== 'range' && (
        <div className="tx-period-static">{periodLabel}</div>
      )}

      {/* ── Диапазон дат ─────────────────────────────────────────── */}
      {periodMode === 'range' && (
        <div className="tx-range-row">
          <input
            className="input tx-range-input"
            type="date"
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
          />
          <span className="tx-range-sep">—</span>
          <input
            className="input tx-range-input"
            type="date"
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
          />
        </div>
      )}

      {/* ── Панель фильтров (поиск + категория) ──────────────────── */}
      <div className="tx-filters">
        {/* Поиск */}
        <div className="tx-search">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              className="input"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setExpandedTxId(null); }}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>

        {/* Фильтр по категории */}
        <div className="tx-cat-filter" style={{ position: 'relative' }}>
          <button
            className={`tx-cat-btn ${selectedCatId ? 'active' : ''}`}
            onClick={() => setCatDropOpen((o) => !o)}
          >
            <span className="tx-cat-btn-label">
              {selectedCat ? selectedCat.name : 'Все'}
            </span>
            <ChevronDown size={12} />
          </button>

          {catDropOpen && (
            <div className="tx-cat-dropdown">
              <button
                className={`tx-cat-option ${!selectedCatId ? 'active' : ''}`}
                onClick={() => { setSelectedCatId(null); setCatDropOpen(false); }}
              >
                Все категории
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`tx-cat-option ${selectedCatId === c.id ? 'active' : ''}`}
                  onClick={() => { setSelectedCatId(c.id); setCatDropOpen(false); }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Итого — только для Доходов и Расходов, не для общего списка */}
      {!loading && items.length > 0 && !!type && (
        <div className="tx-total">
          <span>
            {items.length} записей
            {selectedCat && <span className="tx-total-cat"> · {selectedCat.name}</span>}
          </span>
          <span className={`tx-total-amount amount ${type === 'income' ? 'text-income' : type === 'expense' ? 'text-expense' : ''}`}>
            {type === 'income' ? '+' : type === 'expense' ? '-' : ''}{formatAmount(total)} ₽
          </span>
        </div>
      )}


      {loading ? (
        <div className="skeleton-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 44, marginBottom: 4 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p>{search || selectedCatId ? 'Ничего не найдено' : 'Нет записей за этот период'}</p>
          <p className="text-secondary">Добавьте на главной странице</p>
        </motion.div>
      ) : (
        <>
          <AnimatePresence>
            {groupByDate(items).map(({ date, label, items: group }) => (
              <motion.div
                key={date}
                className="tx-group"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="tx-date-header">{label}</div>
                <div className="tx-list">
                  {group.map((tx, i) => {
                    const isExpanded = expandedTxId === tx.id;
                    const displayText = tx.comment || tx.category_name || 'Без описания';

                    return (
                      <motion.div
                        key={tx.id}
                        className={`tx-item glass-card ${isExpanded ? 'tx-item--expanded' : ''}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ delay: i * 0.02 }}
                        layout
                        onClick={() => handleTxClick(tx)}
                      >
                        <div className="tx-item-left">
                          <span className={`tx-item-comment ${isExpanded ? 'tx-item-comment--full' : ''}`}>
                            {displayText}
                          </span>
                          {tx.category_name && tx.comment && (
                            <span className="tx-item-meta">
                              <span className="badge badge-sm">{tx.category_name}</span>
                            </span>
                          )}
                          {isExpanded && (
                            <span className="tx-item-hint">Нажмите ещё раз для редактирования</span>
                          )}
                        </div>
                        <span className={`tx-item-amount amount ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                          {tx.type === 'income' ? '+' : '-'}
                          {formatAmount(tx.amount)} ₽
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          </>
      )}

      <TransactionDetailsSheet
        transaction={selectedTx}
        open={!!selectedTx}
        onOpenChange={(open) => !open && setSelectedTx(null)}
        onUpdated={handleUpdatedTx}
        onDeleted={handleDeletedTx}
      />
    </>
  );
}
