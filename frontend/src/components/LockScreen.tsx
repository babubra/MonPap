import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Delete, ScanFace } from 'lucide-react';
import { useAppLock } from '../hooks/useAppLock';
import './LockScreen.css';

export function LockScreen() {
  const { isLocked, isSupported, hasPasskey, unlockWithPin, unlockWithPasskey } = useAppLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    // Автоматический вызов Face ID при открытии лок-скрина, если он включен
    if (isLocked && hasPasskey) {
      unlockWithPasskey();
    }
  }, [isLocked, hasPasskey, unlockWithPasskey]);

  const handleDigit = async (d: string) => {
    if (pin.length >= 4) return;
    
    const newPin = pin + d;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      const ok = await unlockWithPin(newPin);
      if (!ok) {
        setError(true);
        setTimeout(() => setPin(''), 500); // Очистка при ошибке
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(false);
    }
  };

  if (!isLocked) return null;

  return (
    <motion.div 
      className="lock-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="lock-screen-header">
        <h1 className="lock-app-name">MonPap</h1>
        <p className="lock-prompt">Введите PIN-код</p>
      </div>

      <div className={`lock-dots ${error ? 'lock-error' : ''}`}>
        {[1, 2, 3, 4].map(idx => (
          <div key={idx} className={`lock-dot ${pin.length >= idx ? 'filled' : ''}`} />
        ))}
      </div>

      <div className="lock-numpad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button 
            key={num} 
            className="lock-key"
            onClick={() => handleDigit(num.toString())}
          >
            {num}
          </button>
        ))}
        
        {hasPasskey && isSupported ? (
          <button className="lock-key lock-key-action" onClick={unlockWithPasskey}>
            <ScanFace size={28} />
          </button>
        ) : (
          <div className="lock-key lock-key-empty" />
        )}
        
        <button className="lock-key" onClick={() => handleDigit('0')}>
          0
        </button>
        
        <button className="lock-key lock-key-action" onClick={handleBackspace}>
          <Delete size={24} />
        </button>
      </div>
    </motion.div>
  );
}
