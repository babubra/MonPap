import { useState, useImperativeHandle, forwardRef } from 'react';
import { Pencil } from 'lucide-react';
import { debts as debtsApi, type Debt, type Counterpart } from '../api';
import './DebtEditForm.css';

interface DebtEditFormProps {
  debt: Debt;
  counterpartsList: Counterpart[];
  onSaved: () => void;
}

export interface DebtEditFormRef {
  save: () => Promise<void>;
  isSaving: boolean;
  canSave: boolean;
}

export const DebtEditForm = forwardRef<DebtEditFormRef, DebtEditFormProps>(
  function DebtEditForm({ debt, counterpartsList, onSaved }, ref) {
  const [editAmount, setEditAmount] = useState(String(debt.amount));
  const [editDate, setEditDate] = useState(debt.debt_date.split('T')[0]);
  const [editComment, setEditComment] = useState(debt.comment || '');
  const [editCounterpartId, setEditCounterpartId] = useState<number | ''>(debt.counterpart_id ?? '');
  const [editSaving, setEditSaving] = useState(false);

  async function handleSaveEdit() {
    setEditSaving(true);
    try {
      await debtsApi.update(debt.id, {
        amount: String(editAmount) as unknown as Debt['amount'],
        debt_date: editDate,
        comment: editComment || undefined,
        counterpart_id: editCounterpartId !== '' ? Number(editCounterpartId) : null,
      } as Partial<Debt>);
      onSaved();
    } catch {
      // ошибка
    } finally {
      setEditSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({
    save: handleSaveEdit,
    isSaving: editSaving,
    canSave: !!editAmount && !!editDate,
  }));

  return (
    <div className="debt-edit-form">
      <div className="debt-edit-form-title">
        <Pencil size={13} /> Редактировать долг
      </div>
      <div className="debt-edit-fields">
        <div>
          <label className="debt-edit-label">Сумма</label>
          <input
            className="input"
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="debt-edit-label">Дата</label>
          <input
            className="input"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
        </div>
        <div>
          <label className="debt-edit-label">Субъект</label>
          <select
            className="input"
            value={editCounterpartId}
            onChange={(e) => setEditCounterpartId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">— без субъекта —</option>
            {counterpartsList.map((cp) => (
              <option key={cp.id} value={cp.id}>{cp.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="debt-edit-label">Комментарий</label>
          <input
            className="input"
            type="text"
            placeholder="Необязательно"
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
});
