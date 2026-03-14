import { useState, useEffect, useCallback } from 'react';

const LOCK_ENABLED_KEY = 'monpap_lock_enabled';
const PIN_HASH_KEY = 'monpap_pin_hash';
const WEBAUTHN_CRED_KEY = 'monpap_webauthn_credential_id';
const LOCK_TIMEOUT_MS = 3 * 60 * 1000; // 3 минуты неактивности

// Простейший хеш для PIN (SHA-256)
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useAppLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Инициализация
  useEffect(() => {
    const enabled = localStorage.getItem(LOCK_ENABLED_KEY) === 'true';
    setIsEnabled(enabled);
    setHasPasskey(!!localStorage.getItem(WEBAUTHN_CRED_KEY));
    setIsLocked(enabled); // Блокируем при старте, если включено
    
    // Проверка поддержки WebAuthn
    if (window.PublicKeyCredential) {
      setIsSupported(true);
    }
  }, []);

  // Отслеживание ухода в фон
  useEffect(() => {
    if (!isEnabled) return;

    let hiddenTime = 0;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else {
        if (hiddenTime && Date.now() - hiddenTime > LOCK_TIMEOUT_MS) {
          setIsLocked(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isEnabled]);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    if (!storedHash) return false;
    
    const inputHash = await hashPin(pin);
    if (inputHash === storedHash) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  const enableLock = useCallback(async (pin: string) => {
    const hash = await hashPin(pin);
    localStorage.setItem(PIN_HASH_KEY, hash);
    localStorage.setItem(LOCK_ENABLED_KEY, 'true');
    setIsEnabled(true);
  }, []);

  const disableLock = useCallback(() => {
    localStorage.removeItem(LOCK_ENABLED_KEY);
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(WEBAUTHN_CRED_KEY);
    setIsEnabled(false);
    setHasPasskey(false);
    setIsLocked(false);
  }, []);

  // Soft-WebAuthn (локальная проверка без бэкенда)
  const registerPasskey = useCallback(async () => {
    if (!isSupported) throw new Error('WebAuthn не поддерживается');
    
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'MonPap', id: window.location.hostname },
        user: {
          id: userId,
          name: 'user@monpap',
          displayName: 'User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Face ID / Touch ID
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none'
      }
    }) as PublicKeyCredential;

    if (credential) {
      localStorage.setItem(WEBAUTHN_CRED_KEY, credential.id);
      setHasPasskey(true);
      return true;
    }
    return false;
  }, [isSupported]);

  const unlockWithPasskey = useCallback(async () => {
    const credIdStr = localStorage.getItem(WEBAUTHN_CRED_KEY);
    if (!credIdStr || !isSupported) return false;

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // В реальном WebAuthn id должен быть ArrayBuffer. Для локального использования 
      // многие браузеры разрешают передать сохраненный id как Bufferish, 
      // но проще запросить любой платформенный аутентификатор (без allowCredentials), 
      // так как нам нужен просто сам факт сканирования лица "владельцем телефона".
      
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
        }
      });

      if (assertion) {
        setIsLocked(false);
        return true;
      }
    } catch (e) {
      console.error('Passkey unlock failed', e);
    }
    return false;
  }, [isSupported]);

  return {
    isLocked,
    isEnabled,
    hasPasskey,
    isSupported,
    unlockWithPin,
    enableLock,
    disableLock,
    registerPasskey,
    unlockWithPasskey,
    // Метод для принудительной блокировки (например, кнопка в настройках)
    lockNow: () => setIsLocked(true),
  };
}
