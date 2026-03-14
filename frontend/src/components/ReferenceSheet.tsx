/**
 * ReferenceSheet — Bottom Sheet для выбора из справочника (категории / субъекты).
 * Использует библиотеку Vaul для мобильных «шторок».
 */

import { useState, useMemo } from 'react';
import { Drawer } from 'vaul';
import { Check, Plus } from 'lucide-react';
import './ReferenceSheet.css';

export interface ReferenceItem {
  id: number;
  name: string;
  ai_hint?: string | null;
  type?: string; // для категорий: 'income' | 'expense'
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
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Drawer.Portal>
        <Drawer.Overlay onClick={() => onOpenChange(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)' }} />
        <Drawer.Content
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
            background: 'var(--bg-secondary)',
            borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)',
          }}
        >
          <div className="ref-sheet-content">
            <div className="ref-sheet-handle" />
            <Drawer.Title className="ref-sheet-title">{title}</Drawer.Title>

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
                filtered.map((item) => (
                  <button
                    key={item.id}
                    className={`ref-sheet-item ${selectedId === item.id ? 'ref-sheet-item--selected' : ''}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div>
                      <div className="ref-sheet-item-name">{item.name}</div>
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
