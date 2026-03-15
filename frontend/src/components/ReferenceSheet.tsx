/**
 * ReferenceSheet — Bottom Sheet для выбора из справочника (категории / субъекты).
 * Использует библиотеку Vaul для мобильных «шторок».
 */

import { useState, useMemo } from 'react';
import { Drawer } from 'vaul';
import { Check, Plus, X } from 'lucide-react';
import './ReferenceSheet.css';

export interface ReferenceItem {
  id: number;
  name: string;
  icon?: string | null;
  ai_hint?: string | null;
  type?: string;     // для категорий: 'income' | 'expense'
  parent_id?: number | null; // для подкатегорий
}

interface ReferenceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: ReferenceItem[];
  selectedId?: number | null;
  onSelect: (item: ReferenceItem) => void;
  onCreate?: (name: string) => Promise<ReferenceItem | null>;
  /** Показывать подсказки (ai_hint) */
  showHints?: boolean;
}

export function ReferenceSheet({
  open,
  onOpenChange,
  title,
  items,
  selectedId,
  onSelect,
  onCreate,
  showHints = false,
}: ReferenceSheetProps) {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.ai_hint?.toLowerCase().includes(q),
    );
  }, [items, search]);

  function handleSelect(item: ReferenceItem) {
    onSelect(item);
    onOpenChange(false);
    setSearch('');
    setCreating(false);
  }

  async function handleCreate() {
    if (!newName.trim() || !onCreate) return;
    setSaving(true);
    try {
      const created = await onCreate(newName.trim());
      if (created) {
        handleSelect(created);
        setNewName('');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="ref-sheet-overlay" />
        <Drawer.Content
          className="ref-sheet-drawer"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
            borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)',
            boxShadow: '0 -4px 40px rgba(213, 163, 65, 0.35), 0 -1px 0 rgba(213, 163, 65, 0.6)',
            overflow: 'hidden',
          }}
        >
          {/* Градиентная шапка с accent-полосой */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(213,163,65,0.18) 0%, rgba(213,163,65,0.0) 100%)',
            padding: '10px 16px 6px',
            borderTop: '2px solid rgba(213, 163, 65, 0.8)',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(213,163,65,0.7)' }} />
          </div>
          <div className="ref-sheet-content">
            <div className="ref-sheet-header">
              <Drawer.Title className="ref-sheet-title">{title}</Drawer.Title>
              <button
                className="ref-sheet-close"
                onClick={() => onOpenChange(false)}
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            </div>

            <input
              className="input ref-sheet-search"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="ref-sheet-list">
              {filtered.length === 0 ? (
                <div className="ref-sheet-empty">
                  {search ? 'Ничего не найдено' : 'Список пуст'}
                </div>
              ) : (
                filtered
                  // Сортируем так, чтобы потомки шли за родителями (если мы не ищем)
                  .sort((a, b) => {
                    if (search.trim()) return 0; // При поиске просто выводим как есть
                    const aIsChild = !!a.parent_id;
                    const bIsChild = !!b.parent_id;
                    if (!aIsChild && !bIsChild) return a.name.localeCompare(b.name);
                    
                    // a - потомок, b - родитель
                    if (aIsChild && !bIsChild) {
                        if (a.parent_id === b.id) return 1;
                        const aParent = filtered.find(i => i.id === a.parent_id);
                        return (aParent?.name || '').localeCompare(b.name) || 1;
                    }
                    // a - родитель, b - потомок
                    if (!aIsChild && bIsChild) {
                        if (b.parent_id === a.id) return -1;
                        const bParent = filtered.find(i => i.id === b.parent_id);
                        return a.name.localeCompare(bParent?.name || '') || -1;
                    }
                    // оба потомки
                    const aParent = filtered.find(i => i.id === a.parent_id);
                    const bParent = filtered.find(i => i.id === b.parent_id);
                    if (a.parent_id === b.parent_id) return a.name.localeCompare(b.name);
                    return (aParent?.name || '').localeCompare(bParent?.name || '');
                  })
                  .map((item) => (
                  <button
                    key={item.id}
                    className={`ref-sheet-item ${selectedId === item.id ? 'ref-sheet-item--selected' : ''}`}
                    onClick={() => handleSelect(item)}
                    style={item.parent_id && !search.trim() ? { paddingLeft: '32px', borderLeft: '2px solid var(--accent-color)' } : {}}
                  >
                    <div>
                      <div className="ref-sheet-item-name">{item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}{item.name}</div>
                      {showHints && item.ai_hint && (
                        <div className="ref-sheet-item-hint">{item.ai_hint}</div>
                      )}
                    </div>
                    {selectedId === item.id && (
                      <Check size={18} className="ref-sheet-item-check" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Создание нового элемента */}
            {onCreate && !creating && (
              <button
                className="ref-sheet-create-btn"
                onClick={() => setCreating(true)}
              >
                <Plus size={16} />
                Создать новый
              </button>
            )}

            {onCreate && creating && (
              <div className="ref-sheet-create-form">
                <div className="ref-sheet-create-form-row">
                  <input
                    className="input"
                    placeholder="Название..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleCreate}
                    disabled={!newName.trim() || saving}
                  >
                    {saving ? '...' : 'Добавить'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
