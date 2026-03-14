/**
 * Settings — настройки: тема, кастомный промт, выход.
 * Категории и Субъекты вынесены в отдельный раздел /references.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, LogOut, MessageSquare, Shield, ScanFace } from 'lucide-react';
import {
  settings as settingsApi,
  type UserSettings,
  setToken,
} from '../api';
import { useAppLock } from '../hooks/useAppLock';
import { PinSetupSheet } from '../components/PinSetupSheet';
import './Settings.css';

interface SettingsProps {
  onLogout: () => void;
}

export function Settings({ onLogout }: SettingsProps) {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Промт
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptDirty, setPromptDirty] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);

  // Безопасность
  const { isEnabled, hasPasskey, isSupported, enableLock, disableLock, registerPasskey, lockNow } = useAppLock();
  const [showPinSetup, setShowPinSetup] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const s = await settingsApi.get();
      setUserSettings(s);
      setCustomPrompt(s.custom_prompt || '');
      document.documentElement.setAttribute('data-theme', s.theme);
    } catch {
      // оффлайн
    } finally {
      setLoading(false);
    }
  }

  // ── Тема ──────────────────────────────────
  async function toggleTheme() {
    const newTheme = userSettings?.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('monpap_theme', newTheme);
    try {
      const updated = await settingsApi.update({ theme: newTheme });
      setUserSettings(updated);
    } catch {
      // оффлайн
    }
  }

  // ── Промт ─────────────────────────────────
  async function savePrompt() {
    setPromptSaving(true);
    try {
      const updated = await settingsApi.update({ custom_prompt: customPrompt });
      setUserSettings(updated);
      setPromptDirty(false);
    } catch {
      // ошибка
    } finally {
      setPromptSaving(false);
    }
  }

  function handleLogout() {
    setToken(null);
    onLogout();
  }

  // ── Безопасность ─────────────────────────────────
  function toggleLock() {
    if (isEnabled) {
      if (window.confirm('Отключить защиту приложения?')) {
        disableLock();
      }
    } else {
      // Открываем кастомную панель ввода PIN
      setShowPinSetup(true);
    }
  }

  async function handlePinConfirmed(pin: string) {
    setShowPinSetup(false);
    await enableLock(pin);
  }

  async function handleAddPasskey() {
    try {
      const ok = await registerPasskey();
      if (ok) alert('Face ID / Touch ID успешно привязан!');
    } catch (e: any) {
      alert('Ошибка привязки биометрии: ' + e.message);
    }
  }

  return (
    <div className="page container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title">Настройки</h1>
      </motion.div>

      {/* Тема */}
      <div className="settings-list">
        <motion.div
          className="settings-item glass-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="settings-item-info">
            {userSettings?.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            <span>Тема оформления</span>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            disabled={loading}
            aria-label="Переключить тему"
          >
            <div className={`theme-toggle-track ${userSettings?.theme === 'light' ? 'theme-toggle-track--light' : ''}`}>
              <div className="theme-toggle-thumb" />
            </div>
          </button>
        </motion.div>
      </div>

      {/* Кастомный промт */}
      <div className="settings-section">
        <div className="settings-section-title">
          <MessageSquare size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Кастомный промт для AI
        </div>
        <textarea
          className="input settings-prompt-area"
          placeholder="Например: «Категория Фриланс — это все поступления за проектную работу»"
          value={customPrompt}
          onChange={(e) => {
            setCustomPrompt(e.target.value);
            setPromptDirty(true);
          }}
        />
        <div className="settings-prompt-hint">
          Дополнительные инструкции для нейросети при парсинге ваших текстов
        </div>
        {promptDirty && (
          <div className="settings-prompt-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setCustomPrompt(userSettings?.custom_prompt || '');
                setPromptDirty(false);
              }}
            >
              Отмена
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={savePrompt}
              disabled={promptSaving}
            >
              {promptSaving ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </div>
        )}
      </div>

      {/* Безопасность */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Безопасность
        </div>
        
        <div className="settings-list">
          <motion.div className="settings-item glass-card" style={{ marginBottom: 8 }}>
            <div className="settings-item-info">
              <span>Защита PIN-кодом</span>
            </div>
            <button
              className="theme-toggle"
              onClick={toggleLock}
              aria-label="Переключить PIN"
            >
              {/* --light класс = thumb справа = включено */}
              <div className={`theme-toggle-track ${isEnabled ? 'theme-toggle-track--light' : ''}`}>
                <div className="theme-toggle-thumb" />
              </div>
            </button>
          </motion.div>

          {isEnabled && (
            <motion.button
              className="settings-item glass-card"
              onClick={lockNow}
              style={{ marginBottom: isSupported ? 8 : 0, justifyContent: 'center' }}
            >
              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Заблокировать сейчас</span>
            </motion.button>
          )}

          {isEnabled && isSupported && (
            <motion.div className="settings-item glass-card">
              <div className="settings-item-info">
                <ScanFace size={20} />
                <span>Вход по Face ID / Отпечатку</span>
              </div>
              {hasPasskey ? (
                <span className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>Подключено</span>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={handleAddPasskey}>
                  Подключить
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Выход */}
      <div className="settings-section">
        <motion.button
          className="settings-item glass-card settings-logout"
          onClick={handleLogout}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <div className="settings-item-info">
            <LogOut size={20} />
            <span>Выйти из аккаунта</span>
          </div>
        </motion.button>
      </div>

      <PinSetupSheet
        open={showPinSetup}
        onClose={() => setShowPinSetup(false)}
        onConfirm={handlePinConfirmed}
      />
    </div>
  );
}
