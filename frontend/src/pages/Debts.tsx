/**
 * Debts — страница долгов: активные/закрытые, прогресс-бар, платежи.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import {
  Landmark, ArrowUpRight, ArrowDownLeft,
  ChevronDown, ChevronUp, Plus, Trash2, Search,
} from 'lucide-react';
import { debts as debtsApi, type Debt, type DebtPayment } from '../api';
import { useShowAmounts } from '../hooks/useShowAmounts';
import './Debts.css';

/** Группирует долги по дате. */
function groupDebtsByDate(items: Debt[]): { date: string; label: string; items: Debt[] }[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const fmtKey = (d: Date) => d.toISOString().split('T')[0];
  const todayKey = fmtKey(today);
  const yesterdayKey = fmtKey(yesterday);

  const map = new Map<string, Debt[]>();
  for (const debt of items) {
    const key = debt.debt_date.split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(debt);
  }

  return Array.from(map.entries()).map(([date, debts]) => {
    let label: string;
    if (date === todayKey) {
      label = 'Сегодня';
    } else if (date === yesterdayKey) {
      label = 'Вчера';
    } else {
      label = new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    return { date, label, items: debts };
  });
}

export function Debts() {
  const [activeDebts, setActiveDebts] = useState<Debt[]>([]);
  const [closedDebts, setClosedDebts] = useState<Debt[]>([]);
  const [tab, setTab] = useState<'active' | 'closed'>('active');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const { formatAmount } = useShowAmounts();

  // Форма платежа
  const [payDebtId, setPayDebtId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payComment, setPayComment] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paySaving, setPaySaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [active, closed] = await Promise.all([
        debtsApi.list({ is_closed: false }),
        debtsApi.list({ is_closed: true }),
      ]);
      setActiveDebts(active);
      setClosedDebts(closed);
    } catch {
      // оффлайн
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentList = (tab === 'active' ? activeDebts : closedDebts).filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.counterpart_name?.toLowerCase().includes(q) ||
      d.comment?.toLowerCase().includes(q)
    );
  });

  const totalGave = activeDebts
    .filter((d) => d.direction === 'gave')
    .reduce((s, d) => s + Number(d.amount) - Number(d.paid_amount), 0);

  const totalTook = activeDebts
    .filter((d) => d.direction === 'took')
    .reduce((s, d) => s + Number(d.amount) - Number(d.paid_amount), 0);

  async function handleAddPayment() {
    if (!payDebtId || !payAmount) return;
    setPaySaving(true);
    try {
      await debtsApi.addPayment(payDebtId, {
        amount: Number(payAmount),
        payment_date: payDate,
        comment: payComment || undefined,
      });
      setPayDebtId(null);
      setPayAmount('');
      setPayComment('');
      loadData();
    } catch {
      // ошибка
    } finally {
      setPaySaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await debtsApi.delete(id);
      loadData();
    } catch {
      // ошибка
    }
  }

  function getProgress(debt: Debt): number {
    const amount = Number(debt.amount);
    const paid = Number(debt.paid_amount);
    if (amount <= 0) return 0;
    return Math.min(100, (paid / amount) * 100);
  }

  return (
    <div className="page container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title">
          <Landmark size={24} style={{ color: 'var(--accent)', verticalAlign: 'middle', marginRight: 8 }} />
          Долги
        </h1>
      </motion.div>

      {/* Сводка */}
      {!loading && activeDebts.length > 0 && (
        <div className="debts-summary">
          <div className="debts-summary-card glass-card">
            <span className="debts-summary-label">Мне должны</span>
            <span className="debts-summary-value text-income amount">
              {formatAmount(totalGave)} ₽
            </span>
          </div>
          <div className="debts-summary-card glass-card">
            <span className="debts-summary-label">Я должен</span>
            <span className="debts-summary-value text-expense amount">
              {formatAmount(totalTook)} ₽
            </span>
          </div>
        </div>
      )}

      {/* Табы */}
      <div className="debts-tabs">
        <button
          className={`debts-tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => { setTab('active'); setSearch(''); }}
        >
          Активные ({activeDebts.length})
        </button>
        <button
          className={`debts-tab ${tab === 'closed' ? 'active' : ''}`}
          onClick={() => { setTab('closed'); setSearch(''); }}
        >
          Закрытые ({closedDebts.length})
        </button>
      </div>

      {/* Поиск */}
      <div className="debts-search">
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
            }}
          />
          <input
            className="input debts-search-input"
            placeholder="Поиск по субъекту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      {/* Список */}
      {loading ? (
        <div className="skeleton-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, marginBottom: 8 }} />
          ))}
        </div>
      ) : currentList.length === 0 ? (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Landmark size={48} style={{ color: 'var(--accent)', marginBottom: 12 }} />
          <p>{tab === 'active' ? 'Активных долгов нет' : 'Закрытых долгов нет'}</p>
          <p className="text-secondary">Добавьте на главной странице</p>
        </motion.div>
      ) : (
        <AnimatePresence>
          {groupDebtsByDate(currentList).map(({ date, label, items: group }) => (
            <motion.div
              key={date}
              className="tx-group"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="tx-date-header">{label}</div>

              {group.map((debt, i) => {
                const progress = getProgress(debt);
                const isExpanded = expandedId === debt.id;

                return (
                  <motion.div
                    key={debt.id}
                    className="debt-card glass-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setExpandedId(isExpanded ? null : debt.id)}
                  >
                    <div className="debt-card-header">
                      <div className="debt-card-info">
                        <span className="debt-card-name">
                          {debt.counterpart_name || 'Без субъекта'}
                        </span>
                        <span className="debt-card-direction">
                          {debt.direction === 'gave' ? (
                            <>
                              <ArrowUpRight size={12} style={{ color: 'var(--income)' }} />
                              Дал в долг
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft size={12} style={{ color: 'var(--expense)' }} />
                              Взял в долг
                            </>
                          )}
                        </span>
                      </div>
                      <div className="debt-card-amount">
                        <span className={`debt-card-amount-value amount ${debt.direction === 'gave' ? 'text-income' : 'text-expense'}`}>
                          {formatAmount(debt.amount)} ₽
                        </span>
                        {Number(debt.paid_amount) > 0 && (
                          <span className="debt-card-amount-paid">
                            выплачено: {formatAmount(debt.paid_amount)} ₽
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Прогресс-бар */}
                    {!debt.is_closed && (
                      <div className="debt-progress">
                        <div
                          className="debt-progress-bar"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}

                    <div className="debt-card-meta">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {debt.is_closed && <span className="debt-card-closed-badge">✓ Закрыт</span>}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </div>

                    {/* Развёрнутая секция */}
                    {isExpanded && (
                      <div className="debt-payments" onClick={(e) => e.stopPropagation()}>
                        <div className="debt-payments-title">История платежей</div>

                        {debt.payments.length === 0 ? (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', paddingBottom: 8 }}>
                            Платежей пока нет
                          </div>
                        ) : (
                          debt.payments.map((payment: DebtPayment) => (
                            <div key={payment.id} className="debt-payment-item">
                              <div>
                                <span className="debt-payment-date">
                                  {new Date(payment.payment_date).toLocaleDateString('ru-RU', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                                {payment.comment && (
                                  <span className="debt-payment-comment"> — {payment.comment}</span>
                                )}
                              </div>
                              <span className="debt-payment-amount">
                                +{formatAmount(payment.amount)} ₽
                              </span>
                            </div>
                          ))
                        )}

                        <div className="debt-card-actions">
                          {!debt.is_closed && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setPayDebtId(debt.id)}
                            >
                              <Plus size={14} />
                              Добавить платёж
                            </button>
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDelete(debt.id)}
                            style={{ color: 'var(--danger)' }}
                          >
                            <Trash2 size={14} />
                            Удалить
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Drawer для добавления платежа */}
      <Drawer.Root open={payDebtId !== null} onOpenChange={(open) => !open && setPayDebtId(null)}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)' }} />
          <Drawer.Content
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: 'var(--bg-secondary)',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
            }}
          >
            <div className="payment-form">
              <div className="ref-sheet-handle" />
              <Drawer.Title className="payment-form-title">Добавить платёж</Drawer.Title>

              <div className="payment-form-fields">
                <div>
                  <label className="payment-form-label">Сумма</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="payment-form-label">Дата</label>
                  <input
                    className="input"
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="payment-form-label">Комментарий</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Необязательно"
                    value={payComment}
                    onChange={(e) => setPayComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="parse-actions">
                <button className="btn btn-secondary" onClick={() => setPayDebtId(null)}>
                  Отмена
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddPayment}
                  disabled={!payAmount || paySaving}
                >
                  {paySaving ? 'Сохраняю...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
