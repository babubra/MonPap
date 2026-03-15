import { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { debts as debtsApi } from '../api';
import './DebtPaymentSheet.css';

interface DebtPaymentSheetProps {
  debtId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function DebtPaymentSheet({ debtId, open, onOpenChange, onSaved }: DebtPaymentSheetProps) {
  const [payAmount, setPayAmount] = useState('');
  const [payComment, setPayComment] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paySaving, setPaySaving] = useState(false);

  // Сброс формы при открытии
  useEffect(() => {
    if (open) {
      setPayAmount('');
      setPayComment('');
      setPayDate(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  async function handleAddPayment() {
    if (!debtId || !payAmount) return;
    setPaySaving(true);
    try {
      await debtsApi.addPayment(debtId, {
        amount: Number(payAmount),
        payment_date: payDate,
        comment: payComment || undefined,
      });
      onOpenChange(false);
      onSaved();
    } catch {
      // ошибка
    } finally {
      setPaySaving(false);
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
              <Drawer.Title className="tx-details-type">Добавить платёж</Drawer.Title>
              <button className="btn btn-ghost btn-icon" onClick={() => onOpenChange(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="payment-form-fields">
              <div>
                <label className="payment-form-label">Сумма</label>
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="payment-form-label">Дата</label>
                <input
                  className="input"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div>
                <label className="payment-form-label">Комментарий</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Необязательно"
                  value={payComment}
                  onChange={(e) => setPayComment(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="sheet-footer">
            <button className="btn btn-secondary" onClick={() => onOpenChange(false)}>
              Отмена
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddPayment}
              disabled={!payAmount || paySaving}
            >
              {paySaving ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

