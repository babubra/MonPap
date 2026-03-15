/**
 * ParsePreview — карточка предпросмотра результата AI-парсинга.
 * Позволяет редактировать каждое поле перед сохранением.
 *
 * Для типа debt_payment: загружает активные долги по субъекту
 * и предлагает выбрать конкретный долг для оплаты.
 */

import { useState, useEffect } from 'react';
import { Pencil, AlertTriangle, XCircle, X, ChevronDown } from 'lucide-react';
import {
  type AiParseResult,
  categories as catApi,
  counterparts as cpApi,
  debts as debtsApi,
  type Category,
  type Counterpart,
  type Debt,
} from '../api';
import toast from 'react-hot-toast';
import { ReferenceSheet, type ReferenceItem } from './ReferenceSheet';
import './ParsePreview.css';

/** Тип для сохранённых данных */
export interface ParsedData {
  type: 'income' | 'expense' | 'debt_give' | 'debt_take' | 'debt_payment';
  amount: number;
  currency: string;
  category_id: number | null;
  category_name: string | null;
  counterpart_id: number | null;
  counterpart_name: string | null;
  debt_id: number | null;      // ← для debt_payment: ID конкретного долга
  comment: string;
  date: string;
  raw_text: string;
}

interface ParsePreviewProps {
  result: AiParseResult;
  rawText: string;
  onSave: (data: ParsedData) => Promise<void>;
  onCancel: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  income: 'Доход',
  expense: 'Расход',
  debt_give: 'Дал в долг',
  debt_take: 'Взял в долг',
  debt_payment: 'Оплата долга',
};

export function ParsePreview({ result, rawText, onSave, onCancel }: ParsePreviewProps) {
  const [data, setData] = useState<ParsedData>({
    type: (result.type as ParsedData['type']) || 'expense',
    amount: result.amount || 0,
    currency: result.currency || 'RUB',
    category_id: result.category_id || null,
    category_name: result.category_name || null,
    counterpart_id: result.counterpart_id || null,
    counterpart_name: result.counterpart_name || null,
    debt_id: null,
    comment: result.comment || rawText || '',
    date: result.date || new Date().toISOString().split('T')[0],
    raw_text: rawText,
  });

  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [cpSheetOpen, setCpSheetOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [counterpartsItems, setCounterpartsItems] = useState<Counterpart[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Для debt_payment — список активных долгов
  const [activeDebts, setActiveDebts] = useState<Debt[]>([]);
  const [debtsLoading, setDebtsLoading] = useState(false);

  // Загрузка справочников
  useEffect(() => {
    catApi.list().then(setCategories).catch((e) => toast.error(e.message || 'Ошибка загрузки категорий'));
    cpApi.list().then(setCounterpartsItems).catch((e) => toast.error(e.message || 'Ошибка загрузки контрагентов'));
  }, []);

  // При типе debt_payment — загружаем активные долги
  useEffect(() => {
    if (data.type !== 'debt_payment') {
      setActiveDebts([]);
      return;
    }
    setDebtsLoading(true);
    debtsApi.list({ is_closed: false })
      .then((debts) => {
        setActiveDebts(debts);
        // Авто-выбор: если только один долг по субъекту → выбираем его
        const matched = data.counterpart_id
          ? debts.filter((d) => d.counterpart_id === data.counterpart_id)
          : debts;
        if (matched.length === 1) {
          setData((prev) => ({ ...prev, debt_id: matched[0].id }));
        }
      })
      .catch((e) => toast.error(e.message || 'Ошибка загрузки долгов'))
      .finally(() => setDebtsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.type, data.counterpart_id]);

  function update(partial: Partial<ParsedData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCategory(name: string): Promise<ReferenceItem | null> {
    try {
      const catType = data.type === 'income' ? 'income' : 'expense';
      const created = await catApi.create({ name, type: catType });
      setCategories((prev) => [...prev, created]);
      return created;
    } catch (e: any) {
      toast.error(e.message || 'Ошибка создания категории');
      return null;
    }
  }

  async function handleCreateCounterpart(name: string): Promise<ReferenceItem | null> {
    try {
      const created = await cpApi.create({ name });
      setCounterpartsItems((prev) => [...prev, created]);
      return created;
    } catch (e: any) {
      toast.error(e.message || 'Ошибка создания контрагента');
      return null;
    }
  }

  // Фильтруем категории по типу
  const filteredCategories = categories.filter(
    (c) => c.type === (data.type === 'income' ? 'income' : 'expense'),
  );

  const isDebt = data.type.startsWith('debt_');
  const isDebtPayment = data.type === 'debt_payment';

  // Долги, отфильтрованные по субъекту (если выбран)
  const relevantDebts = data.counterpart_id
    ? activeDebts.filter((d) => d.counterpart_id === data.counterpart_id)
    : activeDebts;

  // Выбранный долг
  const selectedDebt = activeDebts.find((d) => d.id === data.debt_id) || null;

  // Блокируем сохранение если debt_payment без выбранного долга
  const canSave = data.amount > 0 && (!isDebtPayment || !!data.debt_id);

  // Показ rejected
  if (result.status === 'rejected') {
    return (
      <div className="parse-overlay" onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}>
        <div className="parse-card">
          <div className="parse-handle" />
          <div className="parse-error">
            <XCircle size={18} />
            {result.message || 'Запрос не распознан'}
          </div>
          <div className="parse-actions">
            <button className="btn btn-secondary" onClick={onCancel}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="parse-overlay" onMouseDown={(e) => {
      if (e.target === e.currentTarget && !catSheetOpen && !cpSheetOpen) onCancel();
    }}>
      <div className="parse-card">
        <div className="parse-handle" />
        <h3 className="parse-title">Предпросмотр</h3>

        {/* Предупреждение при incomplete */}
        {result.status === 'incomplete' && (
          <div className="parse-warning">
            <AlertTriangle size={18} />
            <div>
              Не хватает данных: {result.missing?.join(', ')}
              <br />
              <span style={{ fontSize: 'var(--font-size-xs)' }}>
                {result.message}
              </span>
            </div>
          </div>
        )}

        {/* Предупреждение для debt_payment без активных долгов */}
        {isDebtPayment && !debtsLoading && relevantDebts.length === 0 && (
          <div className="parse-warning">
            <AlertTriangle size={18} />
            <div>
              {data.counterpart_name
                ? `У «${data.counterpart_name}» нет активных долгов`
                : 'Нет активных долгов. Добавьте долг сначала.'}
            </div>
          </div>
        )}

        <div className="parse-fields">
          {/* Тип */}
          <div className="parse-field">
            <div className="parse-field-left">
              <span className="parse-field-label">Тип</span>
              <div className="parse-type-toggle">
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    className={`parse-type-btn ${data.type === key ? 'active' : ''}`}
                    onClick={() => update({ type: key as ParsedData['type'], debt_id: null })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Сумма */}
          <div className="parse-field">
            <div className="parse-field-left">
              <span className="parse-field-label">Сумма</span>
              {editingField === 'amount' ? (
                <input
                  className="parse-field-inline-input"
                  type="number"
                  value={data.amount || ''}
                  onChange={(e) => update({ amount: Number(e.target.value) })}
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                  autoFocus
                />
              ) : (
                <span className={`parse-field-value ${!data.amount ? 'text-muted' : ''}`}>
                  {data.amount ? `${data.amount.toLocaleString('ru-RU')} ${data.currency}` : 'Не указана'}
                </span>
              )}
            </div>
            <button className="parse-field-edit" onClick={() => setEditingField('amount')}>
              <Pencil size={16} />
            </button>
          </div>

          {/* Категория (только для не-долговых) */}
          {!isDebt && (
            <div className="parse-field">
              <div className="parse-field-left">
                <span className="parse-field-label">Категория</span>
                <span className={`parse-field-value ${!data.category_name ? 'text-muted' : ''}`}>
                  {data.category_name || 'Без категории'}
                </span>
              </div>
              <button className="parse-field-edit" onClick={() => setCatSheetOpen(true)}>
                <Pencil size={16} />
              </button>
            </div>
          )}

          {/* Субъект (для долгов) */}
          {isDebt && (
            <div className="parse-field">
              <div className="parse-field-left">
                <span className="parse-field-label">Субъект</span>
                <span className={`parse-field-value ${!data.counterpart_name ? 'text-muted' : ''}`}>
                  {data.counterpart_name || 'Не указан'}
                </span>
              </div>
              <button className="parse-field-edit" onClick={() => setCpSheetOpen(true)}>
                <Pencil size={16} />
              </button>
            </div>
          )}

          {/* Выбор долга (только для debt_payment) */}
          {isDebtPayment && (
            <div className="parse-field parse-field--debt-select">
              <div className="parse-field-left" style={{ width: '100%' }}>
                <span className="parse-field-label">Погашаемый долг</span>
                {debtsLoading ? (
                  <span className="parse-field-value text-muted">Загрузка...</span>
                ) : relevantDebts.length === 0 ? (
                  <span className="parse-field-value text-muted" style={{ color: 'var(--danger)' }}>
                    Нет активных долгов
                  </span>
                ) : (
                  <div className="parse-debt-select-wrapper">
                    <select
                      className="parse-debt-select"
                      value={data.debt_id ?? ''}
                      onChange={(e) => update({ debt_id: Number(e.target.value) || null })}
                    >
                      <option value="">— Выберите долг —</option>
                      {relevantDebts.map((d) => {
                        const remaining = Number(d.amount) - Number(d.paid_amount);
                        return (
                          <option key={d.id} value={d.id}>
                            {d.counterpart_name || 'Без субъекта'} — {remaining.toLocaleString('ru-RU')} ₽ осталось
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown size={14} className="parse-debt-select-icon" />
                  </div>
                )}
                {selectedDebt && (
                  <span className="parse-debt-info">
                    Итого: {Number(selectedDebt.amount).toLocaleString('ru-RU')} ₽ •
                    Выплачено: {Number(selectedDebt.paid_amount).toLocaleString('ru-RU')} ₽ •
                    Остаток: {(Number(selectedDebt.amount) - Number(selectedDebt.paid_amount)).toLocaleString('ru-RU')} ₽
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Комментарий */}
          <div className="parse-field">
            <div className="parse-field-left">
              <span className="parse-field-label">Комментарий</span>
              {editingField === 'comment' ? (
                <input
                  className="parse-field-inline-input"
                  type="text"
                  value={data.comment}
                  onChange={(e) => update({ comment: e.target.value })}
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                  autoFocus
                />
              ) : (
                <span className={`parse-field-value ${!data.comment ? 'text-muted' : ''}`}>
                  {data.comment || 'Нет'}
                </span>
              )}
            </div>
            <button className="parse-field-edit" onClick={() => setEditingField('comment')}>
              <Pencil size={16} />
            </button>
          </div>

          {/* Дата */}
          <div className="parse-field">
            <div className="parse-field-left">
              <span className="parse-field-label">Дата</span>
              {editingField === 'date' ? (
                <input
                  className="parse-field-inline-input"
                  type="date"
                  value={data.date}
                  onChange={(e) => update({ date: e.target.value })}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                />
              ) : (
                <span className="parse-field-value">
                  {new Date(data.date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
            <button className="parse-field-edit" onClick={() => setEditingField('date')}>
              <Pencil size={16} />
            </button>
          </div>
        </div>

        {/* Кнопки */}
        <div className="parse-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            <X size={16} />
            Отмена
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !canSave}
          >
            {saving ? 'Сохраняю...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Справочники */}
      <ReferenceSheet
        open={catSheetOpen}
        onOpenChange={setCatSheetOpen}
        title="Выберите категорию"
        items={filteredCategories}
        selectedId={data.category_id}
        onSelect={(item) => update({ category_id: item.id, category_name: item.name })}
        onCreate={handleCreateCategory}
      />

      <ReferenceSheet
        open={cpSheetOpen}
        onOpenChange={setCpSheetOpen}
        title="Выберите субъекта"
        items={counterpartsItems}
        selectedId={data.counterpart_id}
        onSelect={(item) => update({ counterpart_id: item.id, counterpart_name: item.name, debt_id: null })}
        onCreate={handleCreateCounterpart}
      />
    </div>
  );
}
