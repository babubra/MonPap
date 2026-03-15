import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Фокус на input при открытии — показывает нативную клавиатуру
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, step]);

  function reset() {
    setStep('enter');
    setFirstPin('');
    setPin('');
    setError(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setError(false);

    if (val.length === 4) {
      if (step === 'enter') {
        setFirstPin(val);
        setPin('');
        setStep('confirm');
      } else {
        if (val === firstPin) {
          setTimeout(() => {
            onConfirm(val);
            reset();
          }, 150);
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        }
      }
    }
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
        onClick={() => { reset(); onClose(); }}
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

          {/* Точки индикатора */}
          <div
            className={`pin-setup-dots ${error ? 'pin-error' : ''}`}
            onClick={() => inputRef.current?.focus()}
          >
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className={`pin-setup-dot ${pin.length >= idx ? 'filled' : ''}`} />
            ))}
          </div>

          {error && <p className="pin-error-text">PIN-коды не совпадают</p>}

          {/* Подсказка — тап для открытия клавиатуры */}
          <p className="pin-tap-hint" onClick={() => inputRef.current?.focus()}>
            Нажмите для ввода
          </p>

          {/* Скрытый input — вызывает нативную числовую клавиатуру */}
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={handleChange}
            maxLength={4}
            autoComplete="off"
            className="pin-setup-hidden-input"
            aria-label="Введите PIN-код"
          />

          <button
            className="btn btn-secondary pin-setup-cancel"
            onClick={() => { reset(); onClose(); }}
          >
            Отмена
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
