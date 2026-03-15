/**
 * References — справочники: Категории и Субъекты.
 * Отдельная страница с переключением вкладок и inline-редактированием AI-подсказок.
 */

import { useState, useEffect } from 'react';
import { Tag, Users, Trash2, Plus, Sparkles, Check, Search, Pencil } from 'lucide-react';
import {
  categories as catApi,
  counterparts as cpApi,
  type Category,
  type Counterpart,
} from '../api';
import { EmojiPicker } from '../components/EmojiPicker';
import './References.css';

export function References() {
  const [tab, setTab] = useState<'categories' | 'counterparts'>('categories');

  // Категории
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [newCatParentId, setNewCatParentId] = useState<number | null>(null);
  const [catSearch, setCatSearch] = useState('');
  const [expandedCatId, setExpandedCatId] = useState<number | null>(null);
  const [catHints, setCatHints] = useState<Record<number, string>>({});
  const [catEditNames, setCatEditNames] = useState<Record<number, string>>({});
  const [catEditTypes, setCatEditTypes] = useState<Record<number, 'income' | 'expense'>>({});
  const [catEditParents, setCatEditParents] = useState<Record<number, number | null>>({});
  const [catEditIcons, setCatEditIcons] = useState<Record<number, string>>({});
  const [newCatIcon, setNewCatIcon] = useState<string>('');

  // Субъекты
  const [counterpartsList, setCounterpartsList] = useState<Counterpart[]>([]);
  const [newCpName, setNewCpName] = useState('');
  const [cpSearch, setCpSearch] = useState('');
  const [expandedCpId, setExpandedCpId] = useState<number | null>(null);
  const [cpHints, setCpHints] = useState<Record<number, string>>({});
  const [cpEditNames, setCpEditNames] = useState<Record<number, string>>({});
  const [cpEditIcons, setCpEditIcons] = useState<Record<number, string>>({});
  const [newCpIcon, setNewCpIcon] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [savingHint, setSavingHint] = useState<number | null>(null);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<number | null>(null);
  const [confirmDeleteCpId, setConfirmDeleteCpId] = useState<number | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [cats, cps] = await Promise.all([catApi.list(), cpApi.list()]);
      setCategoriesList(cats);
      setCounterpartsList(cps);

      const ch: Record<number, string> = {};
      const cn: Record<number, string> = {};
      const ct: Record<number, 'income' | 'expense'> = {};
      const cp_parents: Record<number, number | null> = {};
      const ci: Record<number, string> = {};
      cats.forEach((c) => {
        ch[c.id] = c.ai_hint || '';
        cn[c.id] = c.name;
        ct[c.id] = c.type as 'income' | 'expense';
        cp_parents[c.id] = c.parent_id || null;
        ci[c.id] = c.icon || '';
      });
      setCatHints(ch);
      setCatEditNames(cn);
      setCatEditTypes(ct);
      setCatEditParents(cp_parents);
      setCatEditIcons(ci);

      const cph: Record<number, string> = {};
      const cpn: Record<number, string> = {};
      const cpi: Record<number, string> = {};
      cps.forEach((cp) => {
        cph[cp.id] = cp.ai_hint || '';
        cpn[cp.id] = cp.name;
        cpi[cp.id] = cp.icon || '';
      });
      setCpHints(cph);
      setCpEditNames(cpn);
      setCpEditIcons(cpi);
    } catch {
      // оффлайн
    } finally {
      setLoading(false);
    }
  }

  // ── Категории ──────────────────────────────────────────────────

  async function addCategory() {
    if (!newCatName.trim()) return;
    try {
      const created = await catApi.create({ name: newCatName.trim(), type: newCatType, parent_id: newCatParentId, icon: newCatIcon || undefined });
      setCategoriesList((prev) => [...prev, created]);
      setCatHints((prev) => ({ ...prev, [created.id]: '' }));
      setNewCatName('');
      setNewCatParentId(null);
      setNewCatIcon('');
    } catch { /* ошибка */ }
  }

  async function deleteCategory(id: number) {
    try {
      await catApi.delete(id);
      setCategoriesList((prev) => prev.filter((c) => c.id !== id));
      if (expandedCatId === id) setExpandedCatId(null);
      setConfirmDeleteCatId(null);
    } catch { /* ошибка */ }
  }

  async function saveCategory(id: number) {
    const hint = catHints[id] ?? '';
    const editName = catEditNames[id];
    const editType = catEditTypes[id];
    const editParentId = catEditParents[id];
    const cat = categoriesList.find((c) => c.id === id);
    if (!cat) return;

    // Собираем только изменённые поля
    const patch: Partial<Pick<Category, 'name' | 'type' | 'parent_id' | 'icon'> & { ai_hint: string | undefined }> = {};
    if (editName && editName.trim() && editName.trim() !== cat.name) patch.name = editName.trim();
    if (editType && editType !== cat.type) patch.type = editType;
    if (editParentId !== cat.parent_id) patch.parent_id = editParentId;
    if (hint !== (cat.ai_hint || '')) patch.ai_hint = hint || undefined;
    const editIcon = catEditIcons[id] ?? '';
    if (editIcon !== (cat.icon || '')) patch.icon = editIcon || null;

    if (Object.keys(patch).length === 0) return; // нет изменений

    setSavingHint(id);
    try {
      const updated = await catApi.update(id, patch);
      setCategoriesList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: updated.name, type: updated.type, parent_id: updated.parent_id, icon: updated.icon, ai_hint: updated.ai_hint } : c))
      );
      // Синхронизируем локальный стейт редактирования
      setCatEditNames((p) => ({ ...p, [id]: updated.name }));
      setCatEditTypes((p) => ({ ...p, [id]: updated.type as 'income' | 'expense' }));
      setCatEditParents((p) => ({ ...p, [id]: updated.parent_id }));
      setCatEditIcons((p) => ({ ...p, [id]: updated.icon || '' }));
      setCatHints((p) => ({ ...p, [id]: updated.ai_hint || '' }));
      setExpandedCatId(null);
    } catch { /* ошибка */ } finally {
      setSavingHint(null);
    }
  }

  // ── Субъекты ───────────────────────────────────────────────────

  async function addCounterpart() {
    if (!newCpName.trim()) return;
    try {
      const created = await cpApi.create({ name: newCpName.trim(), icon: newCpIcon || undefined });
      setCounterpartsList((prev) => [...prev, created]);
      setCpHints((prev) => ({ ...prev, [created.id]: '' }));
      setCpEditNames((prev) => ({ ...prev, [created.id]: created.name }));
      setNewCpName('');
      setNewCpIcon('');
    } catch { /* ошибка */ }
  }

  async function deleteCounterpart(id: number) {
    try {
      await cpApi.delete(id);
      setCounterpartsList((prev) => prev.filter((c) => c.id !== id));
      if (expandedCpId === id) setExpandedCpId(null);
      setConfirmDeleteCpId(null);
    } catch { /* ошибка */ }
  }

  async function saveCounterpart(id: number) {
    const hint = cpHints[id] ?? '';
    const editName = cpEditNames[id];
    const cp = counterpartsList.find((c) => c.id === id);
    if (!cp) return;

    const patch: Partial<Pick<Counterpart, 'name' | 'icon'> & { ai_hint: string | undefined }> = {};
    if (editName && editName.trim() && editName.trim() !== cp.name) patch.name = editName.trim();
    if (hint !== (cp.ai_hint || '')) patch.ai_hint = hint || undefined;
    const editIcon = cpEditIcons[id] ?? '';
    if (editIcon !== (cp.icon || '')) patch.icon = editIcon || null;

    if (Object.keys(patch).length === 0) return;

    setSavingHint(id);
    try {
      const updated = await cpApi.update(id, patch);
      setCounterpartsList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: updated.name, icon: updated.icon, ai_hint: updated.ai_hint } : c))
      );
      setCpEditNames((p) => ({ ...p, [id]: updated.name }));
      setCpEditIcons((p) => ({ ...p, [id]: updated.icon || '' }));
      setCpHints((p) => ({ ...p, [id]: updated.ai_hint || '' }));
      setExpandedCpId(null);
    } catch { /* ошибка */ } finally {
      setSavingHint(null);
    }
  }

  // ── Фильтрация ─────────────────────────────────────────────────

  const filteredCats = categoriesList.filter((c) =>
    catSearch ? c.name.toLowerCase().includes(catSearch.toLowerCase()) : true
  );

  const filteredCps = counterpartsList.filter((cp) =>
    cpSearch ? cp.name.toLowerCase().includes(cpSearch.toLowerCase()) : true
  );

  return (
    <div className="page container">
      <div
        className="page-header"
      >
        <h1 className="page-title">Справочники</h1>
      </div>

      {/* Табы */}
      <div className="ref-tabs">
        <button
          className={`ref-tab ${tab === 'categories' ? 'active' : ''}`}
          onClick={() => { setTab('categories'); setCatSearch(''); }}
        >
          <Tag size={15} />
          Категории ({categoriesList.length})
        </button>
        <button
          className={`ref-tab ${tab === 'counterparts' ? 'active' : ''}`}
          onClick={() => { setTab('counterparts'); setCpSearch(''); }}
        >
          <Users size={15} />
          Субъекты ({counterpartsList.length})
        </button>
      </div>

      {/* ── Вкладка: Категории ─────────────────────────────────── */}
      {tab === 'categories' && (
        <div
          key="categories"
        >
          {/* Поиск */}
          <div className="ref-search">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input"
                placeholder="Поиск категории..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                style={{ paddingLeft: 32 }}
              />
            </div>
          </div>

          {/* Добавить */}
          <div className="ref-mgmt-add-form-container" style={{ marginBottom: '12px', marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <EmojiPicker
                value={newCatIcon || null}
                onChange={setNewCatIcon}
                placeholder="😀"
              />
              <input
                className="input ref-mgmt-add-input"
                placeholder="Новая категория..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                style={{ flex: 1 }}
              />
            </div>
            <div className="ref-mgmt-add-form-row">
              <select
                className="input ref-mgmt-add-select"
                value={newCatParentId || ''}
                onChange={(e) => setNewCatParentId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- Базовая --</option>
                {categoriesList
                  .filter(c => c.type === newCatType && !c.parent_id)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
              <select
                className="input ref-mgmt-add-select"
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as 'income' | 'expense')}
              >
                <option value="expense">Расход</option>
                <option value="income">Доход</option>
              </select>
              <button className="btn btn-primary ref-mgmt-add-btn" onClick={addCategory} disabled={!newCatName.trim()}>
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Список */}
          <div className="ref-mgmt-list">
            {loading
              ? [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 4 }} />)
              : filteredCats.length === 0
                ? <p className="ref-empty">Нет категорий</p>
                : filteredCats
                    .sort((a, b) => {
                      if (catSearch.trim()) return 0; // При поиске просто выводим как есть
                      const aIsChild = !!a.parent_id;
                      const bIsChild = !!b.parent_id;
                      if (!aIsChild && !bIsChild) return a.name.localeCompare(b.name);
                      
                      // a - потомок, b - родитель
                      if (aIsChild && !bIsChild) {
                          if (a.parent_id === b.id) return 1;
                          const aParent = filteredCats.find(i => i.id === a.parent_id);
                          return (aParent?.name || '').localeCompare(b.name) || 1;
                      }
                      // a - родитель, b - потомок
                      if (!aIsChild && bIsChild) {
                          if (b.parent_id === a.id) return -1;
                          const bParent = filteredCats.find(i => i.id === b.parent_id);
                          return a.name.localeCompare(bParent?.name || '') || -1;
                      }
                      // оба потомки
                      const aParent = filteredCats.find(i => i.id === a.parent_id);
                      const bParent = filteredCats.find(i => i.id === b.parent_id);
                      if (a.parent_id === b.parent_id) return a.name.localeCompare(b.name);
                      return (aParent?.name || '').localeCompare(bParent?.name || '');
                    })
                    .map((cat) => {
                    const isExpanded = expandedCatId === cat.id;
                    const hintValue = catHints[cat.id] ?? '';
                    const editName = catEditNames[cat.id] ?? cat.name;
                    const editType = catEditTypes[cat.id] ?? cat.type;
                    const editIcon = catEditIcons[cat.id] ?? (cat.icon || '');
                    const hasChanges = editName.trim() !== cat.name || editType !== cat.type || hintValue !== (cat.ai_hint || '') || editIcon !== (cat.icon || '');
                    return (
                      <div
                        key={cat.id}
                        className={`ref-mgmt-item ${isExpanded ? 'ref-mgmt-item--expanded' : ''}`}
                        style={cat.parent_id && !catSearch.trim() ? { marginLeft: '24px', position: 'relative' } : {}}
                      >
                        {cat.parent_id && !catSearch.trim() && (
                          <div style={{ position: 'absolute', left: '-12px', top: '50%', width: '12px', height: '2px', background: 'var(--border)', transform: 'translateY(-50%)' }} />
                        )}
                        <div className="ref-mgmt-item-top">
                          <div className="ref-mgmt-item-info">
                            <span className="ref-mgmt-item-name">
                              {cat.icon && <span className="ref-mgmt-item-icon">{cat.icon}</span>}
                              {cat.name}
                              {cat.ai_hint && <Sparkles size={12} className="ref-mgmt-ai-indicator" />}
                            </span>
                          </div>
                          <span className={`ref-mgmt-item-type ${cat.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                            {cat.type === 'income' ? 'доход' : 'расход'}
                          </span>
                          <div className="ref-mgmt-item-actions">
                            <button
                              className="ref-mgmt-item-btn"
                              onClick={() => {
                                setCatEditNames((p) => ({ ...p, [cat.id]: cat.name }));
                                setCatEditTypes((p) => ({ ...p, [cat.id]: cat.type as 'income' | 'expense' }));
                                setCatEditParents((p) => ({ ...p, [cat.id]: cat.parent_id }));
                                setCatEditIcons((p) => ({ ...p, [cat.id]: cat.icon || '' }));
                                setExpandedCatId(isExpanded ? null : cat.id);
                              }}
                              aria-label="Редактировать"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                            <div
                              className="ref-mgmt-hint-section"
                            >
                              {/* Иконка + Название категории */}
                              <div className="ref-mgmt-edit-field">
                                <label className="ref-mgmt-edit-label">Название</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <EmojiPicker
                                    value={editIcon || null}
                                    onChange={(emoji) => setCatEditIcons((p) => ({ ...p, [cat.id]: emoji }))}
                                    placeholder="😀"
                                  />
                                  <input
                                    className="input ref-mgmt-edit-input"
                                    value={editName}
                                    onChange={(e) => setCatEditNames((p) => ({ ...p, [cat.id]: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && saveCategory(cat.id)}
                                    placeholder="Название категории"
                                    style={{ flex: 1 }}
                                  />
                                </div>
                              </div>

                              {/* Родительская категория */}
                              <div className="ref-mgmt-edit-field">
                                <label className="ref-mgmt-edit-label">Внутри категории</label>
                                <select
                                  className="input"
                                  style={{ padding: '8px 10px', fontSize: 'var(--font-size-xs)' }}
                                  value={catEditParents[cat.id] || ''}
                                  onChange={(e) => setCatEditParents((p) => ({ ...p, [cat.id]: e.target.value ? Number(e.target.value) : null }))}
                                >
                                  <option value="">-- Основная категория --</option>
                                  {categoriesList
                                    .filter(c => c.type === editType && c.id !== cat.id && !c.parent_id)
                                    .map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                              </div>

                              {/* Тип категории */}
                              <div className="ref-mgmt-edit-field">
                                <label className="ref-mgmt-edit-label">Тип</label>
                                <div className="ref-mgmt-type-toggle">
                                  <button
                                    className={`ref-mgmt-type-btn ${editType === 'expense' ? 'active expense' : ''}`}
                                    onClick={() => setCatEditTypes((p) => ({ ...p, [cat.id]: 'expense' }))}
                                  >
                                    Расход
                                  </button>
                                  <button
                                    className={`ref-mgmt-type-btn ${editType === 'income' ? 'active income' : ''}`}
                                    onClick={() => setCatEditTypes((p) => ({ ...p, [cat.id]: 'income' }))}
                                  >
                                    Доход
                                  </button>
                                </div>
                              </div>

                              {/* AI-подсказка */}
                              <div className="ref-mgmt-edit-field">
                                <div className="ref-mgmt-hint-label">
                                  <Sparkles size={12} /> Синонимы для AI
                                </div>
                                <input
                                  className="input ref-mgmt-hint-input"
                                  placeholder="ркк, риэлт, Сергей Риэлт..."
                                  value={hintValue}
                                  onChange={(e) => setCatHints((p) => ({ ...p, [cat.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && saveCategory(cat.id)}
                                />
                                <p className="ref-mgmt-hint-help">
                                  Слова-синонимы через запятую. AI использует их для распознавания.
                                </p>
                              </div>

                              {/* Кнопки действий */}
                              <div className="ref-mgmt-actions-row">
                                {confirmDeleteCatId === cat.id ? (
                                  <>
                                    <span className="ref-mgmt-confirm-label">Удалить категорию?</span>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => setConfirmDeleteCatId(null)}
                                    >
                                      Отмена
                                    </button>
                                    <button
                                      className="btn btn-danger-outline ref-mgmt-delete-btn"
                                      onClick={() => deleteCategory(cat.id)}
                                    >
                                      <Trash2 size={14} /> Да, удалить
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      className="btn btn-danger-outline ref-mgmt-delete-btn"
                                      onClick={() => setConfirmDeleteCatId(cat.id)}
                                    >
                                      <Trash2 size={14} /> Удалить
                                    </button>
                                    <button
                                      className="btn btn-primary ref-mgmt-save-btn"
                                      onClick={() => saveCategory(cat.id)}
                                      disabled={savingHint === cat.id || !hasChanges || !editName.trim()}
                                    >
                                      {savingHint === cat.id ? 'Сохранение...' : <><Check size={14} /> Сохранить</>}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    );
                  })}

          </div>
        </div>
      )}

      {/* ── Вкладка: Субъекты ──────────────────────────────────── */}
      {tab === 'counterparts' && (
        <div
          key="counterparts"
        >
          {/* Поиск */}
          <div className="ref-search">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input"
                placeholder="Поиск субъекта..."
                value={cpSearch}
                onChange={(e) => setCpSearch(e.target.value)}
                style={{ paddingLeft: 32 }}
              />
            </div>
          </div>

          {/* Список */}
          <div className="ref-mgmt-list">
            {loading
              ? [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 4 }} />)
              : filteredCps.length === 0
                ? <p className="ref-empty">Нет субъектов</p>
                : filteredCps.map((cp) => {
                    const isExpanded = expandedCpId === cp.id;
                    const hintValue = cpHints[cp.id] ?? '';
                    const editName = cpEditNames[cp.id] ?? cp.name;
                    const hasChanges = editName.trim() !== cp.name || hintValue !== (cp.ai_hint || '') || (cpEditIcons[cp.id] ?? (cp.icon || '')) !== (cp.icon || '');
                    return (
                      <div
                        key={cp.id}
                        className={`ref-mgmt-item ${isExpanded ? 'ref-mgmt-item--expanded' : ''}`}
                      >
                        <div className="ref-mgmt-item-top">
                          <div className="ref-mgmt-item-info">
                            <span className="ref-mgmt-item-name">
                              {cp.icon && <span className="ref-mgmt-item-icon">{cp.icon}</span>}
                              {cp.name}
                              {cp.ai_hint && <Sparkles size={12} className="ref-mgmt-ai-indicator" />}
                            </span>
                          </div>
                          <div className="ref-mgmt-item-actions">
                            <button
                              className="ref-mgmt-item-btn"
                              onClick={() => {
                                setCpEditNames((p) => ({ ...p, [cp.id]: cp.name }));
                                setCpEditIcons((p) => ({ ...p, [cp.id]: cp.icon || '' }));
                                setExpandedCpId(isExpanded ? null : cp.id);
                              }}
                              aria-label="Редактировать"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                            <div
                              className="ref-mgmt-hint-section"
                            >
                              {/* Иконка + Имя субъекта */}
                              <div className="ref-mgmt-edit-field">
                                <label className="ref-mgmt-edit-label">Название</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <EmojiPicker
                                    value={cpEditIcons[cp.id] || null}
                                    onChange={(emoji) => setCpEditIcons((p) => ({ ...p, [cp.id]: emoji }))}
                                    placeholder="😊"
                                  />
                                  <input
                                    className="input ref-mgmt-edit-input"
                                    value={editName}
                                    onChange={(e) => setCpEditNames((p) => ({ ...p, [cp.id]: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && saveCounterpart(cp.id)}
                                    placeholder="Имя субъекта"
                                    style={{ flex: 1 }}
                                  />
                                </div>
                              </div>

                              {/* AI-подсказка */}
                              <div className="ref-mgmt-edit-field">
                                <div className="ref-mgmt-hint-label">
                                  <Sparkles size={12} /> Синонимы для AI
                                </div>
                                <input
                                  className="input ref-mgmt-hint-input"
                                  placeholder="мамочка, мать, родители..."
                                  value={hintValue}
                                  onChange={(e) => setCpHints((p) => ({ ...p, [cp.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && saveCounterpart(cp.id)}
                                />
                                <p className="ref-mgmt-hint-help">
                                  Слова-синонимы через запятую. AI использует их для распознавания.
                                </p>
                              </div>

                              {/* Кнопки действий */}
                              <div className="ref-mgmt-actions-row">
                                {confirmDeleteCpId === cp.id ? (
                                  <>
                                    <span className="ref-mgmt-confirm-label">Удалить субъекта?</span>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => setConfirmDeleteCpId(null)}
                                    >
                                      Отмена
                                    </button>
                                    <button
                                      className="btn btn-danger-outline ref-mgmt-delete-btn"
                                      onClick={() => deleteCounterpart(cp.id)}
                                    >
                                      <Trash2 size={14} /> Да, удалить
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      className="btn btn-danger-outline ref-mgmt-delete-btn"
                                      onClick={() => setConfirmDeleteCpId(cp.id)}
                                    >
                                      <Trash2 size={14} /> Удалить
                                    </button>
                                    <button
                                      className="btn btn-primary ref-mgmt-save-btn"
                                      onClick={() => saveCounterpart(cp.id)}
                                      disabled={savingHint === cp.id || !hasChanges || !editName.trim()}
                                    >
                                      {savingHint === cp.id ? 'Сохранение...' : <><Check size={14} /> Сохранить</>}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    );
                  })}
          </div>

          {/* Добавить */}
          <div className="ref-mgmt-add-form">
            <EmojiPicker
              value={newCpIcon || null}
              onChange={setNewCpIcon}
              placeholder="😊"
            />
            <input
              className="input"
              placeholder="Новый субъект..."
              value={newCpName}
              onChange={(e) => setNewCpName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCounterpart()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={addCounterpart} disabled={!newCpName.trim()}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
