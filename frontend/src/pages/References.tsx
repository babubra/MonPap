/**
 * References — справочники: Категории и Субъекты.
 * Редактирование через Bottom Sheet (CategoryEditSheet / CounterpartEditSheet).
 */

import { useState, useEffect } from 'react';
import { Tag, Users, Plus, Sparkles, Search, Pencil } from 'lucide-react';
import {
  categories as catApi,
  counterparts as cpApi,
  type Category,
  type Counterpart,
} from '../api';
import { EmojiPicker } from '../components/EmojiPicker';
import { CategoryEditSheet } from '../components/CategoryEditSheet';
import { CounterpartEditSheet } from '../components/CounterpartEditSheet';
import toast from 'react-hot-toast';
import './References.css';

export function References() {
  const [tab, setTab] = useState<'categories' | 'counterparts'>('categories');

  // Категории
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [newCatParentId, setNewCatParentId] = useState<number | null>(null);
  const [catSearch, setCatSearch] = useState('');
  const [newCatIcon, setNewCatIcon] = useState<string>('');

  // Субъекты
  const [counterpartsList, setCounterpartsList] = useState<Counterpart[]>([]);
  const [newCpName, setNewCpName] = useState('');
  const [cpSearch, setCpSearch] = useState('');
  const [newCpIcon, setNewCpIcon] = useState<string>('');

  const [loading, setLoading] = useState(true);

  // Bottom Sheet состояние
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [editingCp, setEditingCp] = useState<Counterpart | null>(null);
  const [cpSheetOpen, setCpSheetOpen] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [cats, cps] = await Promise.all([catApi.list(), cpApi.list()]);
      setCategoriesList(cats);
      setCounterpartsList(cps);
    } catch {
      // оффлайн
    } finally {
      setLoading(false);
    }
  }

  // ── Категории ──────────────────────────────────────────────────

  async function addCategory() {
    if (!newCatName.trim()) return;
    // Проверка дубликата
    const duplicate = categoriesList.find(
      (c) => c.name.toLowerCase() === newCatName.trim().toLowerCase() && c.type === newCatType
    );
    if (duplicate) {
      toast.error(`Категория «${duplicate.name}» уже существует`);
      return;
    }
    try {
      const created = await catApi.create({ name: newCatName.trim(), type: newCatType, parent_id: newCatParentId, icon: newCatIcon || undefined });
      setCategoriesList((prev) => [...prev, created]);
      setNewCatName('');
      setNewCatParentId(null);
      setNewCatIcon('');
    } catch { /* ошибка */ }
  }

  function openCatEdit(cat: Category) {
    setEditingCat(cat);
    setCatSheetOpen(true);
  }

  function handleCatSaved(updated: Category) {
    setCategoriesList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setCatSheetOpen(false);
  }

  function handleCatDeleted(id: number) {
    setCategoriesList((prev) => prev.filter((c) => c.id !== id));
    setCatSheetOpen(false);
  }

  // ── Субъекты ───────────────────────────────────────────────────

  async function addCounterpart() {
    if (!newCpName.trim()) return;
    // Проверка дубликата
    const duplicate = counterpartsList.find(
      (cp) => cp.name.toLowerCase() === newCpName.trim().toLowerCase()
    );
    if (duplicate) {
      toast.error(`Субъект «${duplicate.name}» уже существует`);
      return;
    }
    try {
      const created = await cpApi.create({ name: newCpName.trim(), icon: newCpIcon || undefined });
      setCounterpartsList((prev) => [...prev, created]);
      setNewCpName('');
      setNewCpIcon('');
    } catch { /* ошибка */ }
  }

  function openCpEdit(cp: Counterpart) {
    setEditingCp(cp);
    setCpSheetOpen(true);
  }

  function handleCpSaved(updated: Counterpart) {
    setCounterpartsList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setCpSheetOpen(false);
  }

  function handleCpDeleted(id: number) {
    setCounterpartsList((prev) => prev.filter((c) => c.id !== id));
    setCpSheetOpen(false);
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
      <div className="page-header">
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
        <div key="categories">
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
              <EmojiPicker value={newCatIcon || null} onChange={setNewCatIcon} placeholder="😀" />
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
                      if (catSearch.trim()) return 0;
                      const aIsChild = !!a.parent_id;
                      const bIsChild = !!b.parent_id;
                      if (!aIsChild && !bIsChild) return a.name.localeCompare(b.name);
                      if (aIsChild && !bIsChild) {
                        if (a.parent_id === b.id) return 1;
                        const aParent = filteredCats.find(i => i.id === a.parent_id);
                        return (aParent?.name || '').localeCompare(b.name) || 1;
                      }
                      if (!aIsChild && bIsChild) {
                        if (b.parent_id === a.id) return -1;
                        const bParent = filteredCats.find(i => i.id === b.parent_id);
                        return a.name.localeCompare(bParent?.name || '') || -1;
                      }
                      const aParent = filteredCats.find(i => i.id === a.parent_id);
                      const bParent = filteredCats.find(i => i.id === b.parent_id);
                      if (a.parent_id === b.parent_id) return a.name.localeCompare(b.name);
                      return (aParent?.name || '').localeCompare(bParent?.name || '');
                    })
                    .map((cat) => (
                      <div
                        key={cat.id}
                        className="ref-mgmt-item"
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
                              onClick={() => openCatEdit(cat)}
                              aria-label="Редактировать"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
          </div>
        </div>
      )}

      {/* ── Вкладка: Субъекты ──────────────────────────────────── */}
      {tab === 'counterparts' && (
        <div key="counterparts">
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

          {/* Добавить — ВВЕРХУ перед списком */}
          <div className="ref-mgmt-add-form-container" style={{ marginBottom: '12px', marginTop: 0 }}>
            <div className="ref-mgmt-add-form">
              <EmojiPicker value={newCpIcon || null} onChange={setNewCpIcon} placeholder="😊" />
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

          {/* Список */}
          <div className="ref-mgmt-list">
            {loading
              ? [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 4 }} />)
              : filteredCps.length === 0
                ? <p className="ref-empty">Нет субъектов</p>
                : filteredCps.map((cp) => (
                    <div key={cp.id} className="ref-mgmt-item">
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
                            onClick={() => openCpEdit(cp)}
                            aria-label="Редактировать"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
          </div>
        </div>
      )}

      {/* Bottom Sheets */}
      <CategoryEditSheet
        category={editingCat}
        allCategories={categoriesList}
        open={catSheetOpen}
        onOpenChange={(open) => { if (!open) setCatSheetOpen(false); }}
        onSaved={handleCatSaved}
        onDeleted={handleCatDeleted}
      />
      <CounterpartEditSheet
        counterpart={editingCp}
        open={cpSheetOpen}
        onOpenChange={(open) => { if (!open) setCpSheetOpen(false); }}
        onSaved={handleCpSaved}
        onDeleted={handleCpDeleted}
      />
    </div>
  );
}
