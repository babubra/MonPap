/**
 * CounterpartEditSheet — Bottom Drawer для редактирования субъекта.
 */
import { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { Trash2, Sparkles, X, Check } from 'lucide-react';
import {
  counterparts as cpApi,
  type Counterpart,
} from '../api';
import toast from 'react-hot-toast';
import { EmojiPicker } from './EmojiPicker';
import './TransactionDetailsSheet.css';

interface Props {
  counterpart: Counterpart | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: Counterpart) => void;
  onDeleted: (id: number) => void;
}

export function CounterpartEditSheet({ counterpart, open, onOpenChange, onSaved, onDeleted }: Props) {
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editHint, setEditHint] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (counterpart && open) {
      setEditName(counterpart.name);
      setEditIcon(counterpart.icon || '');
      setEditHint(counterpart.ai_hint || '');
      setConfirmDelete(false);
    }
  }, [counterpart, open]);

  async function handleSave() {
    if (!counterpart || !editName.trim()) return;

    const patch: Record<string, unknown> = {};
    if (editName.trim() !== counterpart.name) patch.name = editName.trim();
    if (editIcon !== (counterpart.icon || '')) patch.icon = editIcon || null;
    if (editHint !== (counterpart.ai_hint || '')) patch.ai_hint = editHint || null;

    if (Object.keys(patch).length === 0) { onOpenChange(false); return; }

    setSaving(true);
    try {
      const updated = await cpApi.update(counterpart.id, patch as Partial<Counterpart>);
      onSaved(updated);
      onOpenChange(false);
      toast.success('Субъект сохранён');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!counterpart) return;
    try {
      await cpApi.delete(counterpart.id);
      onDeleted(counterpart.id);
      onOpenChange(false);
      toast.success('Субъект удалён');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка удаления');
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="vaul-overlay" />
        <Drawer.Content className="vaul-content glass">
          <div className="vaul-handle" />
          <div className="vaul-body">

            <div className="tx-details-header">
              <span className="tx-details-type">Редактировать субъекта</span>
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
