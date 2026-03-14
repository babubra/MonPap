import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete } from 'lucide-react';
import './PinSetupSheet.css';

interface PinSetupSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
}

type Step = 'enter' | 'confirm';

export function PinSetupSheet({ open, onClose, onConfirm }: PinSetupSheetProps) {
  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function reset() {
    setStep('enter');
    setFirstPin('');
    setPin('');
    setError(false);
  }

  function handleDigit(d: string) {
    if (pin.length >= 4) return;
    const newPin = pin + d;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      setTimeout(() => {
        if (step === 'enter') {
          setFirstPin(newPin);
          setPin('');
          setStep('confirm');
        } else {
          // Подтверждение
          if (newPin === firstPin) {
            onConfirm(newPin);
            reset();
          } else {
            setError(true);
            setTimeout(() => {
              setPin('');
              setError(false);
            }, 600);
          }
        }
      }, 150); // небольшая задержка чтобы 4-я точка успела отрисоваться
    }
  }

  function handleBack() {
    setPin(p => p.slice(0, -1));
    setError(false);
  }

  if (!open) return null;

  const title = step === 'enter' ? 'Введите новый PIN-код' : 'Повторите PIN-код';

  return (
    <AnimatePresence>
      <motion.div
        className="pin-setup-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="pin-setup-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="pin-setup-handle" />

          <p className="pin-setup-title">{title}</p>

          <div className={`pin-setup-dots ${error ? 'pin-error' : ''}`}>
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className={`pin-setup-dot ${pin.length >= idx ? 'filled' : ''}`} />
            ))}
          </div>

          {error && <p className="pin-error-text">PIN-коды не совпадают</p>}

          <div className="pin-setup-numpad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button key={num} className="pin-setup-key" onClick={() => handleDigit(num.toString())}>
                {num}
              </button>
            ))}
            <div className="pin-setup-key pin-setup-key-empty" />
            <button className="pin-setup-key" onClick={() => handleDigit('0')}>0</button>
            <button className="pin-setup-key pin-setup-key-action" onClick={handleBack}>
              <Delete size={22} />
            </button>
          </div>

          <button className="btn btn-secondary pin-setup-cancel" onClick={() => { reset(); onClose(); }}>
            Отмена
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
