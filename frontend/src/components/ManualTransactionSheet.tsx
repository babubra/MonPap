import { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { ChevronRight } from 'lucide-react';
import {
  transactions as txApi,
  categories as catApi,
  type Category,
} from '../api';
import { ReferenceSheet, type ReferenceItem } from './ReferenceSheet';
import toast from 'react-hot-toast';
import './ManualTransactionSheet.css';

interface ManualTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ManualTransactionSheet({ open, onOpenChange, onSaved }: ManualTransactionSheetProps) {
  const [mType, setMType] = useState<'income' | 'expense'>('expense');
  const [mAmount, setMAmount] = useState('');
  const [mComment, setMComment] = useState('');
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [mCatId, setMCatId] = useState<number | null>(null);
  const [mCatName, setMCatName] = useState('');
  
  const [mCatSheet, setMCatSheet] = useState(false);
  const [mSaving, setMSaving] = useState(false);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  useEffect(() => {
    if (open) {
      catApi.list().then(setCategoriesList).catch((e: any) => {
        toast.error(e.message || 'Ошибка загрузки категорий');
      });
    }
  }, [open]);

  // Сброс формы при открытии
  useEffect(() => {
    if (open) {
      setMType('expense');
      setMAmount('');
      setMComment('');
      setMDate(new Date().toISOString().split('T')[0]);
      setMCatId(null);
      setMCatName('');
    }
  }, [open]);

  const filteredCatsForManual = categoriesList.filter((c) => c.type === mType);

  async function saveManualTx() {
    if (!mAmount) return;
    setMSaving(true);
    try {
      await txApi.create({
        type: mType,
        amount: Number(mAmount),
        transaction_date: mDate,
        category_id: mCatId || undefined,
        comment: mComment || undefined,
      });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения транзакции');
    } finally {
      setMSaving(false);
    }
  }

  async function handleCreateCatInSheet(name: string): Promise<ReferenceItem | null> {
    try {
      const created = await catApi.create({ name, type: mType });
      setCategoriesList((prev) => [...prev, created]);
      return created;
    } catch {
      return null;
    }
  }

  return (
    <>
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)' }} />
          <Drawer.Content
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: 'var(--bg-secondary)',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
            }}
          >
            <div className="manual-tx-content">
              <div className="manual-tx-handle" />
              <Drawer.Title className="manual-tx-title">Новая транзакция</Drawer.Title>

              <div className="manual-tx-fields">
                {/* Тип */}
                <div>
                  <label className="manual-tx-label">Тип</label>
                  <div className="manual-tx-type-row">
                    <button
                      className={`manual-tx-type-btn ${mType === 'expense' ? 'active' : ''}`}
                      onClick={() => { setMType('expense'); setMCatId(null); setMCatName(''); }}
                    >
                      Расход
                    </button>
                    <button
                      className={`manual-tx-type-btn ${mType === 'income' ? 'active' : ''}`}
                      onClick={() => { setMType('income'); setMCatId(null); setMCatName(''); }}
                    >
                      Доход
                    </button>
                  </div>
                </div>

                {/* Сумма */}
                <div>
                  <label className="manual-tx-label">Сумма</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    value={mAmount}
                    onChange={(e) => setMAmount(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Категория */}
                <div>
                  <label className="manual-tx-label">Категория</label>
                  <button className="manual-tx-cat-picker" onClick={() => setMCatSheet(true)}>
                    {mCatName ? (
                      <span>{mCatName}</span>
                    ) : (
                      <span className="text-muted">Выберите категорию...</span>
                    )}
                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }} />
                  </button>
                </div>

                {/* Комментарий */}
                <div>
                  <label className="manual-tx-label">Комментарий</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Необязательно"
                    value={mComment}
                    onChange={(e) => setMComment(e.target.value)}
                  />
                </div>

                {/* Дата */}
                <div>
                  <label className="manual-tx-label">Дата</label>
                  <input
                    className="input"
                    type="date"
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="parse-actions">
                <button className="btn btn-secondary" onClick={() => onOpenChange(false)}>
                  Отмена
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveManualTx}
                  disabled={!mAmount || mSaving}
                >
                  {mSaving ? 'Сохраняю...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <ReferenceSheet
        open={mCatSheet}
        onOpenChange={setMCatSheet}
        title="Выберите категорию"
        items={filteredCatsForManual}
        selectedId={mCatId}
        onSelect={(item) => { setMCatId(item.id); setMCatName(item.name); }}
        onCreate={handleCreateCatInSheet}
      />
    </>
  );
}
