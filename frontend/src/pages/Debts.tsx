/**
 * Debts — страница долгов: активные/закрытые, прогресс-бар, платежи.
 */

import { useState, useEffect, useCallback } from 'react';

import {
  Landmark, ArrowUpRight, ArrowDownLeft,
  ChevronDown, ChevronUp, Plus, Trash2, Search, Pencil, X,
} from 'lucide-react';
import { debts as debtsApi, counterparts as cpApi, type Debt, type DebtPayment, type Counterpart } from '../api';
import { useShowAmounts } from '../hooks/useShowAmounts';
import { DebtPaymentSheet } from '../components/DebtPaymentSheet';
import { DebtEditForm } from '../components/DebtEditForm';
import { Drawer } from 'vaul';
import toast from 'react-hot-toast';
import './Debts.css';
import '../components/TransactionDetailsSheet.css';

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

  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, debts]) => {
      debts.sort((a, b) => {
        const timeDiff = new Date(b.debt_date).getTime() - new Date(a.debt_date).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id - a.id;
      });

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
  const [counterpartsList, setCounterpartsList] = useState<Counterpart[]>([]);

  // Форма платежа (ссылка на ID для открытия Drawer)
  const [payDebtId, setPayDebtId] = useState<number | null>(null);

  // Редактирование долга
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteDebtId, setConfirmDeleteDebtId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [active, closed, cps] = await Promise.all([
        debtsApi.list({ is_closed: false }),
        debtsApi.list({ is_closed: true }),
        cpApi.list(),
      ]);
      setActiveDebts(active);
      setClosedDebts(closed);
      setCounterpartsList(cps);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка загрузки долгов');
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



  async function handleDelete(id: number) {
    try {
      await debtsApi.delete(id);
      if (expandedId === id) setExpandedId(null);
      setConfirmDeleteDebtId(null);
      loadData();
      toast.success('Долг удален');
    } catch (e: any) {
      toast.error(e.message || 'Не удалось удалить долг');
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
      <div
        className="page-header"
      >
        <h1 className="page-title">
          <Landmark size={24} style={{ color: 'var(--accent)', verticalAlign: 'middle', marginRight: 8 }} />
          Долги
        </h1>
      </div>

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
        <div
          className="empty-state"
        >
          <Landmark size={48} style={{ color: 'var(--accent)', marginBottom: 12 }} />
          <p>{tab === 'active' ? 'Активных долгов нет' : 'Закрытых долгов нет'}</p>
          <p className="text-secondary">Добавьте на главной странице</p>
        </div>
      ) : (
        <>
          {groupDebtsByDate(currentList).map(({ date, label, items: group }) => (
            <div
              key={date}
              className="tx-group"
            >
              <div className="tx-date-header">{label}</div>

              {group.map((debt) => {
                const progress = getProgress(debt);
                const isExpanded = expandedId === debt.id;

                return (
                  <div
                    key={debt.id}
                    className="debt-card glass-card"
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
                        {debt.comment && (
                          <span className="debt-card-comment">{debt.comment}</span>
                        )}
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

                    <div
                      className="debt-card-meta debt-card-meta--clickable"
                      onClick={() => setExpandedId(isExpanded ? null : debt.id)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {debt.is_closed && <span className="debt-card-closed-badge">✓ Закрыт</span>}
                        {!debt.is_closed && !isExpanded && (
                          <span className="debt-card-tap-hint">нажмите для деталей</span>
                        )}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </div>

                    {/* Развёрнутая секция */}
                    {isExpanded && (
                      <div className="debt-payments" onClick={(e) => e.stopPropagation()}>

                        {/* Форма редактирования убрана в Bottom Sheet — открывается кнопкой ✏️ */}
                        <>
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
                                className="btn btn-secondary btn-sm debt-edit-icon-btn"
                                onClick={() => setEditingId(debt.id)}
                                title="Изменить долг"
                              >
                                <Pencil size={15} />
                              </button>
                              {confirmDeleteDebtId === debt.id ? (
                                <>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setConfirmDeleteDebtId(null)}
                                  >
                                    Отмена
                                  </button>
                                  <button
                                    className="btn btn-sm"
                                    style={{ background: 'var(--danger)', color: 'white' }}
                                    onClick={() => handleDelete(debt.id)}
                                  >
                                    <Trash2 size={13} /> Да, удалить
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setConfirmDeleteDebtId(debt.id)}
                                  style={{ color: 'var(--danger)' }}
                                >
                                  <Trash2 size={14} />
                                  Удалить
                                </button>
                              )}
                            </div>
                          </>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}

      <DebtPaymentSheet
        debtId={payDebtId}
        open={payDebtId !== null}
        onOpenChange={(open) => !open && setPayDebtId(null)}
        onSaved={loadData}
      />

      {/* Bottom Sheet: редактирование долга */}
      <Drawer.Root
        open={editingId !== null}
        onOpenChange={(open) => { if (!open) setEditingId(null); }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="vaul-overlay" />
          <Drawer.Content className="vaul-content glass">
            <div className="vaul-handle" />
            <div className="vaul-body">
              <div className="tx-details-header">
                <span className="tx-details-type">Редактировать долг</span>
                <button className="btn btn-ghost btn-icon" onClick={() => setEditingId(null)}>
                  <X size={20} />
                </button>
              </div>
              {editingId !== null && (() => {
                const debt = [...activeDebts, ...closedDebts].find(d => d.id === editingId);
                if (!debt) return null;
                return (
                  <DebtEditForm
                    debt={debt}
                    counterpartsList={counterpartsList}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => { setEditingId(null); loadData(); }}
                  />
                );
              })()}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
