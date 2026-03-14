import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-card glass"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
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
          <motion.div
            className="login-sent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Mail size={48} className="login-sent-icon" />
            <h2>Письмо отправлено!</h2>
            <p>
              Ссылка для входа отправлена на <strong>{email}</strong>.
              <br />Проверьте почту.
            </p>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSent(false); setEmail(''); }}
            >
              Другой email
            </button>
          </motion.div>
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
              <motion.p
                className="login-error"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.p>
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
      </motion.div>

      {/* Фоновый градиент */}
      <div className="login-bg-glow" />
    </div>
  );
}
