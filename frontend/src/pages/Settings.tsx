/**
 * Settings — настройки: тема, кастомный промт, выход.
 * Категории и Субъекты вынесены в отдельный раздел /references.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, MessageSquare, Shield, ScanFace, BookMarked, ChevronRight } from 'lucide-react';
import {
  settings as settingsApi,
  type UserSettings,
  setToken,
} from '../api';
import toast from 'react-hot-toast';
import { useAppLock } from '../hooks/useAppLock';
import { PinSetupSheet } from '../components/PinSetupSheet';
import { ConfirmDialog } from '../components/ConfirmDialog';
import './Settings.css';

interface SettingsProps {
  onLogout: () => void;
}

export function Settings({ onLogout }: SettingsProps) {
  const navigate = useNavigate();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Промт
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptDirty, setPromptDirty] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);

  // Безопасность
  const { isEnabled, hasPasskey, isSupported, enableLock, disableLock, registerPasskey, lockNow } = useAppLock();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showConfirmDisable, setShowConfirmDisable] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const s = await settingsApi.get();
      setUserSettings(s);
      setCustomPrompt(s.custom_prompt || '');
      document.documentElement.setAttribute('data-theme', s.theme);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  }

  // ── Тема ──────────────────────────────────
  async function toggleTheme() {
    const currentTheme = userSettings?.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('monpap_theme', newTheme);
    try {
      const updated = await settingsApi.update({ theme: newTheme });
      setUserSettings(updated);
      toast.success('Тема изменена');
    } catch (e: any) {
      // откатываем если ошибка на сервере
      document.documentElement.setAttribute('data-theme', currentTheme || 'light'); // Revert to original theme
      localStorage.setItem('monpap_theme', currentTheme || 'light');
      toast.error(e.message || 'Не удалось сменить тему');
    }
  }

  // ── Промт ─────────────────────────────────
  async function savePrompt() {
    setPromptSaving(true);
    try {
      const updated = await settingsApi.update({ custom_prompt: customPrompt });
      setUserSettings(updated);
      setPromptDirty(false);
      toast.success('Промт сохранен');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения промта');
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
      setShowConfirmDisable(true);
    } else {
      // Открываем кастомную панель ввода PIN
      setShowPinSetup(true);
    }
  }

  function handleConfirmDisable() {
    setShowConfirmDisable(false);
    disableLock();
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
      <div
        className="page-header"
      >
        <h1 className="page-title">Настройки</h1>
      </div>

      {/* Справочники */}
      <div className="settings-list" style={{ marginBottom: 16 }}>
        <button
          className="settings-item glass-card"
          onClick={() => navigate('/references')}
          style={{ cursor: 'pointer', width: '100%' }}
        >
          <div className="settings-item-info">
            <BookMarked size={20} />
            <span>Категории и субъекты</span>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />
        </button>
      </div>

      {/* Тема */}
      <div className="settings-list">
        <div
          className="settings-item glass-card"
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
        </div>
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
          <div className="settings-item glass-card" style={{ marginBottom: 8 }}>
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
          </div>

          {isEnabled && (
            <button
              className="settings-item glass-card"
              onClick={lockNow}
              style={{ marginBottom: isSupported ? 8 : 0, justifyContent: 'center' }}
            >
              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Заблокировать сейчас</span>
            </button>
          )}

          {isEnabled && isSupported && (
            <div className="settings-item glass-card">
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
            </div>
          )}
        </div>
      </div>

      {/* Выход */}
      <div className="settings-section">
        <button
          className="settings-item glass-card settings-logout"
          onClick={handleLogout}
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <div className="settings-item-info">
            <LogOut size={20} />
            <span>Выйти из аккаунта</span>
          </div>
        </button>
      </div>

      <PinSetupSheet
        open={showPinSetup}
        onClose={() => setShowPinSetup(false)}
        onConfirm={handlePinConfirmed}
      />

      <ConfirmDialog
        open={showConfirmDisable}
        title="Защита PIN-кодом"
        message="Отключить защиту приложения?"
        confirmText="Отключить"
        cancelText="Отмена"
        onConfirm={handleConfirmDisable}
        onCancel={() => setShowConfirmDisable(false)}
      />
    </div>
  );
}
