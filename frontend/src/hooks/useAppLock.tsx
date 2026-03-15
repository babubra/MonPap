import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const LOCK_ENABLED_KEY = 'monpap_lock_enabled';
const PIN_HASH_KEY = 'monpap_pin_hash';
const WEBAUTHN_CRED_KEY = 'monpap_webauthn_credential_id';
const LOCK_TIMEOUT_MS = 3 * 60 * 1000;

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}



interface AppLockContextType {
  isLocked: boolean;
  isEnabled: boolean;
  hasPasskey: boolean;
  isSupported: boolean;
  lockNow: () => void;
  unlockWithPin: (pin: string) => Promise<boolean>;
  enableLock: (pin: string) => Promise<void>;
  disableLock: () => void;
  registerPasskey: () => Promise<boolean>;
  unlockWithPasskey: () => Promise<boolean>;
}

const AppLockContext = createContext<AppLockContextType | null>(null);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem(LOCK_ENABLED_KEY) === 'true';
    setIsEnabled(enabled);
    setHasPasskey(!!localStorage.getItem(WEBAUTHN_CRED_KEY));
    setIsLocked(enabled);
    if (window.PublicKeyCredential) setIsSupported(true);
  }, []);

  useEffect(() => {
    if (!isEnabled) return;
    let hiddenTime = 0;
    const handleVisibility = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else if (hiddenTime && Date.now() - hiddenTime > LOCK_TIMEOUT_MS) {
        setIsLocked(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isEnabled]);

  const lockNow = useCallback(() => setIsLocked(true), []);

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

  const registerPasskey = useCallback(async (): Promise<boolean> => {
    if (!isSupported) throw new Error('WebAuthn не поддерживается');
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'MonPap', id: window.location.hostname },
        user: { id: userId, name: 'user@monpap', displayName: 'User' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
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

  const unlockWithPasskey = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000
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

  const value: AppLockContextType = {
    isLocked, isEnabled, hasPasskey, isSupported,
    lockNow, unlockWithPin, enableLock, disableLock, registerPasskey, unlockWithPasskey,
  };

  return (
    <AppLockContext.Provider value={value}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock(): AppLockContextType {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}
