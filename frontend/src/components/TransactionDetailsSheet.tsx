import { useState, useEffect } from 'react';
import { Pencil, X, Calendar, MessageSquare, Save, Trash2, Cpu } from 'lucide-react';
import { Drawer } from 'vaul';
import { 
  transactions as txApi, 
  categories as catApi, 
  type Transaction, 
  type Category 
} from '../api';
import toast from 'react-hot-toast';
import { ReferenceSheet, type ReferenceItem } from './ReferenceSheet';
import { useShowAmounts } from '../hooks/useShowAmounts';
import './TransactionDetailsSheet.css';

interface TransactionDetailsSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (tx: Transaction) => void;
  onDeleted: (id: number) => void;
}

export function TransactionDetailsSheet({ transaction, open, onOpenChange, onUpdated, onDeleted }: TransactionDetailsSheetProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const { formatAmount } = useShowAmounts();
  
  // Local state for edits
  const [editAmount, setEditAmount] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editDate, setEditDate] = useState('');
  
  // Category Reference state
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (transaction && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditAmount(transaction.amount);
      setEditComment(transaction.comment || '');
      setEditDate(transaction.transaction_date.split('T')[0]);
      setEditingField(null);
    }
  }, [transaction, open]);

  useEffect(() => {
    if (open && transaction?.type !== undefined) {
      catApi.list().then(setCategories).catch((e: any) => {
        toast.error(e.message || 'Ошибка загрузки категорий');
      });
    }
  }, [open, transaction?.type]);

  async function handleSaveAmount() {
    if (!transaction || !editAmount || isNaN(Number(editAmount))) return setEditingField(null);
    await performUpdate({ amount: editAmount });
  }

  async function handleSaveComment() {
    if (!transaction) return;
    await performUpdate({ comment: editComment });
  }

  async function handleSaveDate() {
    if (!transaction || !editDate) return setEditingField(null);
    await performUpdate({ transaction_date: editDate });
  }

  async function handleCategorySelect(item: ReferenceItem) {
    if (!transaction) return;
    await performUpdate({ category_id: item.id, category_name: item.name });
  }
  
  async function handleCategoryCreate(name: string): Promise<ReferenceItem | null> {
    if (!transaction) return null;
    try {
      const created = await catApi.create({ name, type: transaction.type });
      setCategories((prev) => [...prev, created]);
      await handleCategorySelect(created);
      return created;
    } catch (e: any) {
      toast.error(e.message || 'Ошибка создания категории');
      return null;
    }
  }

  async function performUpdate(data: Partial<Transaction>) {
    if (!transaction) return;
    try {
      const updatedTx = await txApi.update(transaction.id, data);
      onUpdated(updatedTx);
      setEditingField(null);
      toast.success('Транзакция обновлена');
    } catch (e: any) {
      // Offline mode handles failures transparently
      onUpdated({ ...transaction, ...data } as Transaction);
      setEditingField(null);
      toast.error(e.message || 'Ошибка обновления транзакции');
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    try {
      await txApi.delete(transaction.id);
      onDeleted(transaction.id);
      onOpenChange(false);
      toast.success('Транзакция удалена');
    } catch (e: any) {
      onDeleted(transaction.id); // Still delete locally in offline mode
      onOpenChange(false);
      toast.error(e.message || 'Ошибка удаления транзакции');
    }
  }

  const isIncome = transaction?.type === 'income';
  const filteredCategories = transaction ? categories.filter(c => c.type === transaction.type) : [];

  return (
    <>
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="vaul-overlay" />
          <Drawer.Content className="vaul-content tx-details-content glass">
            {transaction && (
              <>
                <div className="vaul-handle" />
                <div className="vaul-body">
                  
                  <div className="tx-details-header">
                    <span className="tx-details-type">
                      {isIncome ? 'Доход' : 'Расход'}
                    </span>
                    <button className="btn btn-ghost btn-icon" onClick={() => onOpenChange(false)}>
                      <X size={20} />
                    </button>
                  </div>

                  {/* Amount */}
                  <div className="tx-details-amount-container">
                    {editingField === 'amount' ? (
                      <div className="tx-details-edit-row">
                        <input 
                          type="number" 
                          className="tx-details-input-h1"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onBlur={handleSaveAmount}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveAmount()}
                          autoFocus
                        />
                        <button className="btn btn-primary btn-icon" onClick={handleSaveAmount}>
                          <Save size={18} />
                        </button>
                      </div>
                    ) : (
                      <h1 
                        className={`tx-details-amount ${isIncome ? 'text-income' : 'text-expense'}`}
                        onClick={() => setEditingField('amount')}
                      >
                        {isIncome ? '+' : '-'}{formatAmount(transaction.amount)} {transaction.currency}
                        <Pencil size={18} className="tx-details-edit-icon" />
                      </h1>
                    )}
                  </div>

                  <div className="tx-details-fields">
                    {/* Category */}
                    <div className="tx-details-field glass-card" onClick={() => setCatSheetOpen(true)}>
                      <div className="tx-details-field-icon">
                        <div style={{ backgroundColor: isIncome ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)', padding: 8, borderRadius: 8 }}>
                           {isIncome ? '💰' : '🛒'}
                        </div>
                      </div>
                      <div className="tx-details-field-content">
                        <span className="tx-details-label">Категория</span>
                        <span className={`tx-details-value ${!transaction.category_name ? 'text-muted' : ''}`}>
                          {transaction.category_name || 'Не указана'}
                        </span>
                      </div>
                      <Pencil size={16} className="text-secondary" />
                    </div>

                    {/* Date */}
                    <div className="tx-details-field glass-card">
                      <div className="tx-details-field-icon">
                        <Calendar size={20} className="text-secondary" />
                      </div>
                      <div className="tx-details-field-content">
                        <span className="tx-details-label">Дата операции</span>
                        {editingField === 'date' ? (
                          <input 
                            type="date" 
                            className="input"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            onBlur={handleSaveDate}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveDate()}
                            autoFocus
                          />
                        ) : (
                          <span className="tx-details-value" onClick={() => setEditingField('date')}>
                            {new Date(transaction.transaction_date).toLocaleDateString('ru-RU', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                            <Pencil size={14} className="tx-details-inline-edit-icon" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comment */}
                    <div className="tx-details-field glass-card">
                      <div className="tx-details-field-icon">
                        <MessageSquare size={20} className="text-secondary" />
                      </div>
                      <div className="tx-details-field-content">
                        <span className="tx-details-label">Комментарий</span>
                        {editingField === 'comment' ? (
                          <input 
                            type="text" 
                            className="input"
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            onBlur={handleSaveComment}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveComment()}
                            autoFocus
                          />
                        ) : (
                          <span className={`tx-details-value ${!transaction.comment ? 'text-muted' : ''}`} onClick={() => setEditingField('comment')}>
                            {transaction.comment || 'Нет комментария'}
                            <Pencil size={14} className="tx-details-inline-edit-icon" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Raw AI Text */}
                    {transaction.raw_text && (
                      <div className="tx-details-raw-card">
                        <div className="tx-details-raw-header">
                           <Cpu size={14} />
                           Исходный запрос к AI
                        </div>
                        <div className="tx-details-raw-bubble">
                          "{transaction.raw_text}"
                        </div>
                      </div>
                    )}
                    
                  </div>

                  <div className="tx-details-actions">
                    <button className="btn btn-secondary tx-details-delete" onClick={handleDelete}>
                      <Trash2 size={16} />
                      Удалить запись
                    </button>
                  </div>

                </div>
              </>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Выбор категории, рисуется поверх текущей шторки */}
      <ReferenceSheet
        open={catSheetOpen}
        onOpenChange={setCatSheetOpen}
        title="Выберите категорию"
        items={filteredCategories}
        selectedId={transaction?.category_id}
        onSelect={handleCategorySelect}
        onCreate={handleCategoryCreate}
      />
    </>
  );
}
