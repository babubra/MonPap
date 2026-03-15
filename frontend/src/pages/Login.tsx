import { useState, useRef, useEffect } from 'react';
import { Mail, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { auth, setToken } from '../api';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // PIN-код: 6 отдельных полей
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [pinLoading, setPinLoading] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await auth.requestLink(email.trim());

      // DEV_MODE: токен приходит сразу
      if (result.token) {
        setToken(result.token);
        onLogin();
        return;
      }

      setSent(true);
      // Фокус на первое поле PIN
      setTimeout(() => pinRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    // Только цифры
    const digit = value.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);

    // Автопереход на следующее поле
    if (digit && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newPin = pasted.split('');
      setPin(newPin);
      pinRefs.current[5]?.focus();
    }
  };

  // Автоотправка когда все 6 цифр введены
  useEffect(() => {
    const code = pin.join('');
    if (code.length === 6 && sent) {
      handlePinSubmit(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handlePinSubmit = async (code?: string) => {
    const pinCode = code || pin.join('');
    if (pinCode.length !== 6) return;

    setPinLoading(true);
    setError('');

    try {
      const result = await auth.verifyPin(email.trim(), pinCode);
      setToken(result.access_token);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный код');
      setPin(['', '', '', '', '', '']);
      pinRefs.current[0]?.focus();
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div
        className="login-card glass"
      >
        {/* Лого */}
        <div className="login-logo">
          <img
            src="/logo.png"
            alt="MonPap"
            className="login-logo-img"
          />
          <h1 className="login-title">MonPap</h1>
          <p className="login-subtitle">Учёт финансов с AI</p>
        </div>

        {sent ? (
          <div
            className="login-sent"
          >
            <KeyRound size={36} className="login-sent-icon" />
            <h2>Введите код</h2>
            <p>
              Код отправлен на <strong>{email}</strong>
            </p>

            {/* PIN-код fields */}
            <div className="pin-input-group" onPaste={handlePinPaste}>
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { pinRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  className="pin-input"
                  value={digit}
                  onChange={e => handlePinChange(i, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                  disabled={pinLoading}
                />
              ))}
            </div>

            {error && (
              <p
                className="login-error"
              >
                {error}
              </p>
            )}

            {pinLoading && (
              <div className="pin-loading">
                <Loader2 size={20} className="spin" />
                <span>Проверяю...</span>
              </div>
            )}

            <p className="login-hint">
              Также можно нажать кнопку в письме
            </p>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSent(false); setEmail(''); setPin(['', '', '', '', '', '']); setError(''); }}
            >
              Другой email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-input-group">
              <Mail size={18} className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                className="input login-input"
                placeholder="Ваш email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <p
                className="login-error"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <Loader2 size={20} className="spin" />
              ) : (
                <>
                  Войти
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Фоновый градиент */}
      <div className="login-bg-glow" />
    </div>
  );
}
