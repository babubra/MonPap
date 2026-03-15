/**
 * ParsePreview — карточка предпросмотра результата AI-парсинга.
 * Позволяет редактировать каждое поле перед сохранением.
 *
 * Для типа debt_payment: загружает активные долги по субъекту
 * и предлагает выбрать конкретный долг для оплаты.
 */

import { useState, useEffect } from 'react';
import { Pencil, AlertTriangle, XCircle, X, ChevronDown, Sparkles, Check } from 'lucide-react';
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
import { EmojiPicker } from './EmojiPicker';
import './ParsePreview.css';

/** Тип для сохранённых данных */
export interface ParsedData {
  type: 'income' | 'expense' | 'debt_give' | 'debt_take' | 'debt_payment';
  amount: number;
  currency: string;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
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
    category_icon: result.category_icon || null,
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

  // Диалог создания новой категории
  const [newCatDialogOpen, setNewCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [newCatHint, setNewCatHint] = useState('');
  const [newCatParentId, setNewCatParentId] = useState<number | null>(null);
  // Имя родительской категории которую ещё нет в БД — создадим автоматически
  const [newCatPendingParentName, setNewCatPendingParentName] = useState<string | null>(null);
  const [newCatPendingParentIcon, setNewCatPendingParentIcon] = useState<string>('');
  const [newCatSaving, setNewCatSaving] = useState(false);

  // Для debt_payment — список активных долгов
  const [activeDebts, setActiveDebts] = useState<Debt[]>([]);
  const [debtsLoading, setDebtsLoading] = useState(false);

  // Предупреждение о дубликате
  const [duplicateWarning, setDuplicateWarning] = useState<{
    existingCat: Category;
    newName: string;
    newParentName: string | null;
  } | null>(null);

  // Загрузка справочников
  useEffect(() => {
    catApi.list().then((cats) => {
      setCategories(cats);
      // Умная обработка category_is_new
      if (result.category_is_new && result.category_name) {
        const aiName = result.category_name.toLowerCase();
        const aiParentName = result.category_parent_name?.toLowerCase() || null;

        // Ищем точное совпадение (имя + parent)
        const exactMatch = cats.find((c) => {
          const nameMatch = c.name.toLowerCase() === aiName;
          if (!nameMatch) return false;
          if (aiParentName) {
            const parent = cats.find((p) => p.id === c.parent_id);
            return parent?.name.toLowerCase() === aiParentName;
          }
          return !c.parent_id; // Без parent — совпадает как "основная"
        });

        if (exactMatch) {
          // Точное совпадение — подставляем существующую
          setData((prev) => ({
            ...prev,
            category_id: exactMatch.id,
            category_name: exactMatch.name,
            category_icon: exactMatch.icon || null,
          }));
          return;
        }

        // Ищем совпадение по имени (но с другим parent)
        const nameMatch = cats.find((c) => c.name.toLowerCase() === aiName);
        if (nameMatch) {
          setDuplicateWarning({
            existingCat: nameMatch,
            newName: result.category_name,
            newParentName: result.category_parent_name || null,
          });
          // Пока подставляем существующую, пользователь решит
          setData((prev) => ({
            ...prev,
            category_id: nameMatch.id,
            category_name: nameMatch.name,
            category_icon: nameMatch.icon || null,
          }));
          return;
        }

        // Нет совпадений — подготавливаем диалог создания
        setNewCatName(result.category_name);
        setNewCatIcon(result.category_icon || '');
        setNewCatHint('');
        // Ищем parent по имени среди существующих
        if (aiParentName) {
          const parentCat = cats.find(
            (c) => c.name.toLowerCase() === aiParentName && !c.parent_id
          );
          if (parentCat) {
            // Родитель существует — просто подставляем id
            setNewCatParentId(parentCat.id);
            setNewCatPendingParentName(null);
          } else {
            // Родитель тоже новый — запомним его имя и иконку для автосоздания
            setNewCatParentId(null);
            setNewCatPendingParentName(result.category_parent_name || null);
            setNewCatPendingParentIcon(result.category_parent_icon || '');
          }
        } else {
          setNewCatParentId(null);
          setNewCatPendingParentName(null);
        }
        // Автоматически открываем диалог создания
        setTimeout(() => setNewCatDialogOpen(true), 300);
      }
    }).catch((e) => toast.error(e.message || 'Ошибка загрузки категорий'));
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

  function openNewCatDialog() {
    const catType = data.type === 'income' ? 'income' : 'expense';
    setNewCatName('');
    setNewCatIcon('');
    setNewCatHint('');
    setNewCatParentId(null);
    // Закрываем лист категорий и открываем диалог
    setCatSheetOpen(false);
    // Небольшая задержка чтобы sheet успел закрыться
    setTimeout(() => setNewCatDialogOpen(true), 150);
    return catType;
  }

  async function handleSaveNewCategory() {
    if (!newCatName.trim()) return;
    const catType = data.type === 'income' ? 'income' : 'expense';
    setNewCatSaving(true);
    try {
      let parentId = newCatParentId;

      // Если родительская тоже новая — создаём её первой
      if (!parentId && newCatPendingParentName) {
        toast.loading(`Создаю родительскую: ${newCatPendingParentName}...`, { id: 'parent-cat' });
        const parentCreated = await catApi.create({
          name: newCatPendingParentName.trim(),
          type: catType,
          icon: newCatPendingParentIcon || undefined,
        });
        setCategories((prev) => [...prev, parentCreated]);
        parentId = parentCreated.id;
        toast.dismiss('parent-cat');
      }

      const created = await catApi.create({
        name: newCatName.trim(),
        type: catType,
        icon: newCatIcon || undefined,
        ai_hint: newCatHint || undefined,
        parent_id: parentId,
      });
      setCategories((prev) => [...prev, created]);
      update({ category_id: created.id, category_name: created.name, category_icon: created.icon || newCatIcon || null });
      setNewCatDialogOpen(false);
      setNewCatPendingParentName(null);
      setNewCatPendingParentIcon('');
      toast.success(parentId !== newCatParentId
        ? `Создано: «${newCatPendingParentName}» → «${created.name}»`
        : `Категория «${created.name}» создана`);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка создания категории');
    } finally {
      setNewCatSaving(false);
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

  // Долги, отфильтрованные по субъекту
  // Если субъект новый — у него точно нет долгов, показываем пустой список
  const isNewCounterpart = result.counterpart_is_new && !data.counterpart_id;
  const relevantDebts = isNewCounterpart
    ? []  // у нового субъекта не может быть долгов
    : data.counterpart_id
      ? activeDebts.filter((d) => d.counterpart_id === data.counterpart_id)
      : activeDebts;

  // Выбранный долг
  const selectedDebt = activeDebts.find((d) => d.id === data.debt_id) || null;

  // Блокируем сохранение если:
  // - сумма не указана
  // - debt_payment без выбранного долга
  // - debt_payment без активных долгов вообще
  const canSave = data.amount > 0
    && (!isDebtPayment || (!!data.debt_id && relevantDebts.length > 0));

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
        <div className="parse-header">
          <div className="parse-handle" />
          <h3 className="parse-title">Предпросмотр</h3>
        </div>
        <div className="parse-body">

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
              {isNewCounterpart
                ? <><strong>«{data.counterpart_name}»</strong> не найден в системе. Сначала добавьте долг, затем повторите попытку.</>
                : data.counterpart_id
                  ? <>У <strong>«{data.counterpart_name}»</strong> нет активных долгов. Сначала создайте долг, затем повторите попытку.</>
                  : <>Нет активных долгов. Сначала создайте долг, затем повторите попытку.</>
              }
            </div>
          </div>
        )}

        {/* Предупреждение о дубликате категории */}
        {duplicateWarning && (
          <div className="parse-warning" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} />
              <div>
                Категория «{duplicateWarning.newName}» уже существует
                {(() => {
                  const parent = categories.find(c => c.id === duplicateWarning.existingCat.parent_id);
                  return parent ? ` в «${parent.name}»` : ' (основная)';
                })()}
                {duplicateWarning.newParentName && `. Вы просили создать в «${duplicateWarning.newParentName}».`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 26 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDuplicateWarning(null)}
              >
                Использовать существующую
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setDuplicateWarning(null);
                  setNewCatName(duplicateWarning.newName);
                  setNewCatIcon(result.category_icon || '');
                  setNewCatHint('');
                  if (duplicateWarning.newParentName) {
                    const parentCat = categories.find(
                      (c) => c.name.toLowerCase() === duplicateWarning.newParentName!.toLowerCase() && !c.parent_id
                    );
                    setNewCatParentId(parentCat?.id || null);
                  }
                  setNewCatDialogOpen(true);
                }}
              >
                Создать новую
              </button>
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
                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                  autoFocus
                />
              ) : (
                <span className={`parse-field-value ${!data.amount ? 'text-muted' : ''}`}>
                  {data.amount ? `${data.amount.toLocaleString('ru-RU')} ${data.currency}` : 'Не указана'}
                </span>
              )}
            </div>
            {editingField === 'amount' ? (
              <button className="parse-field-edit parse-field-check" onClick={() => setEditingField(null)}>
                <Check size={16} />
              </button>
            ) : (
              <button className="parse-field-edit" onClick={() => setEditingField('amount')}>
                <Pencil size={16} />
              </button>
            )}
          </div>

          {/* Категория (только для не-долговых) */}
          {!isDebt && (
            <div className="parse-field">
              <div className="parse-field-left">
                <span className="parse-field-label">Категория</span>
                <span className={`parse-field-value ${!data.category_name ? 'text-muted' : ''}`}>
                  {data.category_icon && <span style={{ marginRight: 4 }}>{data.category_icon}</span>}
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
                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                  autoFocus
                />
              ) : (
                <span className={`parse-field-value ${!data.comment ? 'text-muted' : ''}`}>
                  {data.comment || 'Нет'}
                </span>
              )}
            </div>
            {editingField === 'comment' ? (
              <button className="parse-field-edit parse-field-check" onClick={() => setEditingField(null)}>
                <Check size={16} />
              </button>
            ) : (
              <button className="parse-field-edit" onClick={() => setEditingField('comment')}>
                <Pencil size={16} />
              </button>
            )}
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
            {editingField === 'date' ? (
              <button className="parse-field-edit parse-field-check" onClick={() => setEditingField(null)}>
                <Check size={16} />
              </button>
            ) : (
              <button className="parse-field-edit" onClick={() => setEditingField('date')}>
                <Pencil size={16} />
              </button>
            )}
          </div>
        </div>
        </div>{/* /parse-body */}

        {/* Кнопки — вне скролла, всегда видны */}
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
        onSelect={(item) => update({ category_id: item.id, category_name: item.name, category_icon: (item as Category).icon || null })}
        onCreate={(name) => { setNewCatName(name); openNewCatDialog(); return Promise.resolve(null); }}
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

      {/* Диалог создания новой категории */}
      {newCatDialogOpen && (
        <div
          className="parse-overlay"
          style={{ zIndex: 400 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setNewCatDialogOpen(false); }}
        >
          <div className="parse-card" style={{ gap: 0 }}>
            <div className="parse-handle" />
            <h3 className="parse-title">Новая категория</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0 12px' }}>
              {/* Иконка + Название */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <EmojiPicker
                  value={newCatIcon || null}
                  onChange={setNewCatIcon}
                  placeholder="😀"
                />
                <input
                  className="input"
                  placeholder="Название категории"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNewCategory()}
                  autoFocus
                  style={{ flex: 1 }}
                />
              </div>

              {/* Родительская категория */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Внутри категории</label>
                {newCatPendingParentName ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(230,180,50,0.12)',
                    border: '1px solid var(--accent)',
                    fontSize: 'var(--font-size-sm)',
                  }}>
                    <span style={{ fontSize: 18 }}>📁</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>Также будет создана родительская:</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>«{newCatPendingParentName}»</div>
                    </div>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, fontSize: 16 }}
                      onClick={() => setNewCatPendingParentName(null)}
                      title="Не создавать родительскую"
                    >✕</button>
                  </div>
                ) : (
                  <select
                    className="input"
                    style={{ padding: '8px 10px', fontSize: 'var(--font-size-sm)', width: '100%' }}
                    value={newCatParentId || ''}
                    onChange={(e) => setNewCatParentId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">-- Основная категория --</option>
                    {filteredCategories.filter(c => !c.parent_id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* AI-подсказка */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Sparkles size={12} /> Синонимы для AI
                </label>
                <input
                  className="input"
                  placeholder="синонимы через запятую..."
                  value={newCatHint}
                  onChange={(e) => setNewCatHint(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="parse-actions">
              <button className="btn btn-secondary" onClick={() => setNewCatDialogOpen(false)}>
                <X size={16} /> Отмена
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveNewCategory}
                disabled={!newCatName.trim() || newCatSaving}
              >
                {newCatSaving ? 'Создаю...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
