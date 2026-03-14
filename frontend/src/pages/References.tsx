/**
 * References — справочники: Категории и Субъекты.
 * Отдельная страница с переключением вкладок и inline-редактированием AI-подсказок.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Users, Trash2, Plus, Sparkles, Check, Search } from 'lucide-react';
import {
  categories as catApi,
  counterparts as cpApi,
  type Category,
  type Counterpart,
} from '../api';
import './References.css';

export function References() {
  const [tab, setTab] = useState<'categories' | 'counterparts'>('categories');

  // Категории
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [catSearch, setCatSearch] = useState('');
  const [expandedCatId, setExpandedCatId] = useState<number | null>(null);
  const [catHints, setCatHints] = useState<Record<number, string>>({});

  // Субъекты
  const [counterpartsList, setCounterpartsList] = useState<Counterpart[]>([]);
  const [newCpName, setNewCpName] = useState('');
  const [cpSearch, setCpSearch] = useState('');
  const [expandedCpId, setExpandedCpId] = useState<number | null>(null);
  const [cpHints, setCpHints] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [savingHint, setSavingHint] = useState<number | null>(null);

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
      cats.forEach((c) => { ch[c.id] = c.ai_hint || ''; });
      setCatHints(ch);

      const cph: Record<number, string> = {};
      cps.forEach((cp) => { cph[cp.id] = cp.ai_hint || ''; });
      setCpHints(cph);
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
      const created = await catApi.create({ name: newCatName.trim(), type: newCatType });
      setCategoriesList((prev) => [...prev, created]);
      setCatHints((prev) => ({ ...prev, [created.id]: '' }));
      setNewCatName('');
    } catch { /* ошибка */ }
  }

  async function deleteCategory(id: number) {
    try {
      await catApi.delete(id);
      setCategoriesList((prev) => prev.filter((c) => c.id !== id));
      if (expandedCatId === id) setExpandedCatId(null);
    } catch { /* ошибка */ }
  }

  async function saveCatHint(id: number) {
    const hint = catHints[id] ?? '';
    setSavingHint(id);
    try {
      const updated = await catApi.update(id, { ai_hint: hint || undefined });
      setCategoriesList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ai_hint: updated.ai_hint } : c))
      );
    } catch { /* ошибка */ } finally {
      setSavingHint(null);
    }
  }

  // ── Субъекты ───────────────────────────────────────────────────

  async function addCounterpart() {
    if (!newCpName.trim()) return;
    try {
      const created = await cpApi.create({ name: newCpName.trim() });
      setCounterpartsList((prev) => [...prev, created]);
      setCpHints((prev) => ({ ...prev, [created.id]: '' }));
      setNewCpName('');
    } catch { /* ошибка */ }
  }

  async function deleteCounterpart(id: number) {
    try {
      await cpApi.delete(id);
      setCounterpartsList((prev) => prev.filter((c) => c.id !== id));
      if (expandedCpId === id) setExpandedCpId(null);
    } catch { /* ошибка */ }
  }

  async function saveCpHint(id: number) {
    const hint = cpHints[id] ?? '';
    setSavingHint(id);
    try {
      const updated = await cpApi.update(id, { ai_hint: hint || undefined });
      setCounterpartsList((prev) =>
        prev.map((cp) => (cp.id === id ? { ...cp, ai_hint: updated.ai_hint } : cp))
      );
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
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title">Справочники</h1>
      </motion.div>

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
        <motion.div
          key="categories"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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

          {/* Список */}
          <div className="ref-mgmt-list">
            {loading
              ? [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 4 }} />)
              : filteredCats.length === 0
                ? <p className="ref-empty">Нет категорий</p>
                : filteredCats.map((cat) => {
                    const isExpanded = expandedCatId === cat.id;
                    const hintValue = catHints[cat.id] ?? '';
                    return (
                      <motion.div
                        key={cat.id}
                        className={`ref-mgmt-item ${isExpanded ? 'ref-mgmt-item--expanded' : ''}`}
                        layout
                      >
                        <div
                          className="ref-mgmt-item-top"
                          onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                        >
                          <div className="ref-mgmt-item-info">
                            <span className="ref-mgmt-item-name">
                              {cat.name}
                              {cat.ai_hint && <Sparkles size={12} className="ref-mgmt-ai-indicator" />}
                            </span>
                          </div>
                          <span className={`ref-mgmt-item-type ${cat.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                            {cat.type === 'income' ? 'доход' : 'расход'}
                          </span>
                          <div className="ref-mgmt-item-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="ref-mgmt-item-btn danger" onClick={() => deleteCategory(cat.id)} aria-label="Удалить">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              className="ref-mgmt-hint-section"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="ref-mgmt-hint-label">
                                <Sparkles size={12} /> Синонимы для AI
                              </div>
                              <div className="ref-mgmt-hint-row">
                                <input
                                  className="input ref-mgmt-hint-input"
                                  placeholder="ркк, риэлт, Сергей Риэлт..."
                                  value={hintValue}
                                  onChange={(e) => setCatHints((p) => ({ ...p, [cat.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && saveCatHint(cat.id)}
                                />
                                <button
                                  className="btn btn-primary btn-sm ref-mgmt-hint-save"
                                  onClick={() => saveCatHint(cat.id)}
                                  disabled={savingHint === cat.id}
                                >
                                  {savingHint === cat.id ? '...' : <Check size={14} />}
                                </button>
                              </div>
                              <p className="ref-mgmt-hint-help">
                                Слова-синонимы через запятую. AI использует их для распознавания.
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
          </div>

          {/* Добавить */}
          <div className="ref-mgmt-add-form">
            <input
              className="input"
              placeholder="Новая категория..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <select
              className="input"
              style={{ width: 'auto', flex: 'none', padding: '8px 10px', fontSize: 'var(--font-size-xs)' }}
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as 'income' | 'expense')}
            >
              <option value="expense">Расход</option>
              <option value="income">Доход</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={addCategory} disabled={!newCatName.trim()}>
              <Plus size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Вкладка: Субъекты ──────────────────────────────────── */}
      {tab === 'counterparts' && (
        <motion.div
          key="counterparts"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
                    return (
                      <motion.div
                        key={cp.id}
                        className={`ref-mgmt-item ${isExpanded ? 'ref-mgmt-item--expanded' : ''}`}
                        layout
                      >
                        <div
                          className="ref-mgmt-item-top"
                          onClick={() => setExpandedCpId(isExpanded ? null : cp.id)}
                        >
                          <div className="ref-mgmt-item-info">
                            <span className="ref-mgmt-item-name">
                              {cp.name}
                              {cp.ai_hint && <Sparkles size={12} className="ref-mgmt-ai-indicator" />}
                            </span>
                          </div>
                          <div className="ref-mgmt-item-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="ref-mgmt-item-btn danger" onClick={() => deleteCounterpart(cp.id)} aria-label="Удалить">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              className="ref-mgmt-hint-section"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="ref-mgmt-hint-label">
                                <Sparkles size={12} /> Синонимы для AI
                              </div>
                              <div className="ref-mgmt-hint-row">
                                <input
                                  className="input ref-mgmt-hint-input"
                                  placeholder="мамочка, мать, родители..."
                                  value={hintValue}
                                  onChange={(e) => setCpHints((p) => ({ ...p, [cp.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && saveCpHint(cp.id)}
                                />
                                <button
                                  className="btn btn-primary btn-sm ref-mgmt-hint-save"
                                  onClick={() => saveCpHint(cp.id)}
                                  disabled={savingHint === cp.id}
                                >
                                  {savingHint === cp.id ? '...' : <Check size={14} />}
                                </button>
                              </div>
                              <p className="ref-mgmt-hint-help">
                                Слова-синонимы через запятую. AI использует их для распознавания.
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
          </div>

          {/* Добавить */}
          <div className="ref-mgmt-add-form">
            <input
              className="input"
              placeholder="Новый субъект..."
              value={newCpName}
              onChange={(e) => setNewCpName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCounterpart()}
            />
            <button className="btn btn-primary btn-sm" onClick={addCounterpart} disabled={!newCpName.trim()}>
              <Plus size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
