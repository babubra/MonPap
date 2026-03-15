/**
 * CategoryEditSheet — Bottom Drawer для редактирования категории.
 */
import { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { Trash2, Sparkles, X, Check } from 'lucide-react';
import {
  categories as catApi,
  type Category,
} from '../api';
import toast from 'react-hot-toast';
import { EmojiPicker } from './EmojiPicker';
import './TransactionDetailsSheet.css';

interface Props {
  category: Category | null;
  allCategories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: Category) => void;
  onDeleted: (id: number) => void;
}

export function CategoryEditSheet({ category, allCategories, open, onOpenChange, onSaved, onDeleted }: Props) {
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editParentId, setEditParentId] = useState<number | null>(null);
  const [editIcon, setEditIcon] = useState('');
  const [editHint, setEditHint] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (category && open) {
      setEditName(category.name);
      setEditType(category.type as 'income' | 'expense');
      setEditParentId(category.parent_id ?? null);
      setEditIcon(category.icon || '');
      setEditHint(category.ai_hint || '');
      setConfirmDelete(false);
    }
  }, [category, open]);

  async function handleSave() {
    if (!category || !editName.trim()) return;

    const patch: Record<string, unknown> = {};
    if (editName.trim() !== category.name) patch.name = editName.trim();
    if (editType !== category.type) patch.type = editType;
    if (editParentId !== (category.parent_id ?? null)) patch.parent_id = editParentId;
    if (editIcon !== (category.icon || '')) patch.icon = editIcon || null;
    if (editHint !== (category.ai_hint || '')) patch.ai_hint = editHint || null;

    if (Object.keys(patch).length === 0) { onOpenChange(false); return; }

    setSaving(true);
    try {
      const updated = await catApi.update(category.id, patch as Partial<Category>);
      onSaved(updated);
      onOpenChange(false);
      toast.success('Категория сохранена');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!category) return;
    try {
      await catApi.delete(category.id);
      onDeleted(category.id);
      onOpenChange(false);
      toast.success('Категория удалена');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка удаления');
    }
  }

  // Доступные родительские категории того же типа (не сама себя, не дочерние)
  const parentOptions = allCategories.filter(
    (c) => c.id !== category?.id && !c.parent_id && c.type === editType
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="vaul-overlay" />
        <Drawer.Content className="vaul-content glass">
          <div className="vaul-handle" />
          <div className="vaul-body">

            <div className="tx-details-header">
              <span className="tx-details-type">Редактировать категорию</span>
              <button className="btn btn-ghost btn-icon" onClick={() => onOpenChange(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Иконка + Название */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <EmojiPicker value={editIcon || null} onChange={setEditIcon} placeholder="😀" />
                <input
                  className="input"
                  placeholder="Название"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  style={{ flex: 1 }}
                  autoFocus
                />
              </div>

              {/* Тип */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Тип</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['expense', 'income'] as const).map((t) => (
                    <button
                      key={t}
                      className={`btn btn-sm ${editType === t ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => { setEditType(t); setEditParentId(null); }}
                    >
                      {t === 'expense' ? 'Расход' : 'Доход'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Родительская категория */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Внутри категории</label>
                <select
                  className="input"
                  style={{ width: '100%', padding: '8px 10px' }}
                  value={editParentId || ''}
                  onChange={(e) => setEditParentId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— Основная категория —</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* AI-подсказка */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Sparkles size={12} /> Синонимы для AI
                </label>
                <input
                  className="input"
                  placeholder="синонимы через запятую..."
                  value={editHint}
                  onChange={(e) => setEditHint(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

          </div>{/* /vaul-body */}

          {/* Sticky footer — всегда виден */}
          <div className="sheet-footer">
            {confirmDelete ? (
              <>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
                  Отмена
                </button>
                <button className="btn btn-danger-outline" onClick={handleDelete}>
                  <Trash2 size={15} /> Да, удалить
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-secondary tx-details-delete" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} /> Удалить
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                >
                  <Check size={15} /> {saving ? 'Сохраняю...' : 'Сохранить'}
                </button>
              </>
            )}
          </div>

        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
