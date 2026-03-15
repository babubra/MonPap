/**
 * MonPap — API-клиент (fetch wrapper) + Offline features
 */

import { getCache, setCache, addPendingOp, setSettingsCache, getSettingsCache } from './lib/offlineDb';
import toast from 'react-hot-toast';

const API_BASE = '/api';

/** Токен авторизации */
let authToken: string | null = localStorage.getItem('monpap_token');

/** Колбэк при 401 — логаут */
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('monpap_token', token);
  } else {
    localStorage.removeItem('monpap_token');
  }
}

export function getToken(): string | null {
  return authToken;
}

export function isAuthenticated(): boolean {
  return !!authToken;
}

/** Общий fetch с обработкой ошибок */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setToken(null);
    onUnauthorized?.();
    throw new ApiError('Требуется авторизация', 401);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    let errorMessage = `Ошибка ${response.status}`;
    if (typeof data.detail === 'string') {
      errorMessage = data.detail;
    } else if (Array.isArray(data.detail)) {
      errorMessage = data.detail.map((e: { msg?: string }) => e.msg || String(e)).join('; ');
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json();
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// === Offline Helpers ===

async function getWithCache<T>(path: string, storeName?: 'categories' | 'counterparts' | 'transactions' | 'debts' | 'settings', options?: RequestInit): Promise<T> {
  if (navigator.onLine) {
    try {
      const data = await request<T>(path, options);
      if (storeName) {
        if (storeName === 'settings') {
           await setSettingsCache(data);
        } else if (Array.isArray(data)) {
           await setCache(storeName, data);
        }
      }
      return data;
    } catch (e) {
      if (e instanceof TypeError) { // Network error
         if (!storeName) throw e;
         if (storeName === 'settings') return (await getSettingsCache()) as T;
         return (await getCache(storeName)) as T;
      }
      if (e instanceof ApiError) {
         toast.error(e.message);
      }
      throw e;
    }
  } else {
    if (!storeName) throw new Error("Offline and no cache store specified");
    if (storeName === 'settings') return (await getSettingsCache()) as T;
    return (await getCache(storeName)) as T;
  }
}

async function mutateOffline<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, data?: unknown, mockResponse?: unknown): Promise<T> {
  if (navigator.onLine) {
    try {
      return await request<T>(path, {
        method,
        body: data ? JSON.stringify(data) : undefined,
      });
    } catch (e) {
      if (e instanceof TypeError) { // Network error
         await addPendingOp({ method, endpoint: path, payload: data });
         return mockResponse as T;
      }
      if (e instanceof ApiError) {
         toast.error(e.message);
      }
      throw e;
    }
  } else {
    await addPendingOp({ method, endpoint: path, payload: data });
    return mockResponse as T;
  }
}

// ── Auth ─────────────────────────────────────────────────────

export const auth = {
  requestLink: (email: string) =>
    request<{ message: string; token?: string }>('/auth/request-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verify: (token: string) =>
    request<{ access_token: string }>(`/auth/verify?token=${token}`),

  verifyPin: (email: string, code: string) =>
    request<{ access_token: string }>('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  me: () => request<{ id: number; email: string }>('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),
};

// ── Categories ───────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  ai_hint: string | null;
  created_at: string;
}

export const categories = {
  list: (type?: string) =>
    getWithCache<Category[]>(`/categories${type ? `?type=${type}` : ''}`, 'categories'),

  create: (data: { name: string; type: string; ai_hint?: string }) =>
    mutateOffline<Category>('POST', '/categories', data, { id: -Date.now(), ...data, created_at: new Date().toISOString() }),

  update: (id: number, data: Partial<Category>) =>
    mutateOffline<Category>('PUT', `/categories/${id}`, data, { id, ...data }),

  delete: (id: number) =>
    mutateOffline('DELETE', `/categories/${id}`, undefined, {}),
};

// ── Counterparts ─────────────────────────────────────────────

export interface Counterpart {
  id: number;
  name: string;
  ai_hint: string | null;
  created_at: string;
}

export const counterparts = {
  list: () => getWithCache<Counterpart[]>('/counterparts', 'counterparts'),

  create: (data: { name: string; ai_hint?: string }) =>
    mutateOffline<Counterpart>('POST', '/counterparts', data, { id: -Date.now(), ...data, created_at: new Date().toISOString() }),

  update: (id: number, data: Partial<Counterpart>) =>
    mutateOffline<Counterpart>('PUT', `/counterparts/${id}`, data, { id, ...data }),

  delete: (id: number) =>
    mutateOffline('DELETE', `/counterparts/${id}`, undefined, {}),
};

// ── Transactions ─────────────────────────────────────────────

export interface Transaction {
  id: number;
  category_id: number | null;
  category_name: string | null;
  type: 'income' | 'expense';
  amount: string;
  currency: string;
  comment: string | null;
  raw_text: string | null;
  client_id: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionSummary {
  month: string;
  total_income: string;
  total_expense: string;
  balance: string;
}

export const transactions = {
  list: async (params?: {
    type?: string;
    year?: number;
    month?: number;
    date_from?: string;   // YYYY-MM-DD
    date_to?: string;     // YYYY-MM-DD
    category_id?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v));
      });
    }
    const qs = query.toString();
    try {
      return await getWithCache<Transaction[]>(`/transactions${qs ? `?${qs}` : ''}`, 'transactions');
    } catch {
      toast.error('Ошибка загрузки транзакций, показаны кэшированные данные');
      // Offline fallback: fetch all cached and filter locally
      const cached = await getCache('transactions') as Transaction[];
      return cached.filter(t => {
        if (params?.type && t.type !== params.type) return false;
        if (params?.year && params?.month) {
          const d = new Date(t.transaction_date);
          if (d.getFullYear() !== params.year || d.getMonth() + 1 !== params.month) return false;
        }
        return true;
      });
    }
  },

  create: (data: {
    type: string;
    amount: number;
    transaction_date: string;
    category_id?: number;
    comment?: string;
    raw_text?: string;
    client_id?: string;
    currency?: string;
  }) =>
    mutateOffline<Transaction>('POST', '/transactions', data, { id: -Date.now(), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),

  update: (id: number, data: Partial<Transaction>) => {
    // Backend schema does not accept these fields for update
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { category_name, created_at, updated_at, client_id, raw_text, ...cleanData } = data;
    return mutateOffline<Transaction>('PUT', `/transactions/${id}`, cleanData, { id, ...data, updated_at: new Date().toISOString() });
  },

  delete: (id: number) =>
    mutateOffline('DELETE', `/transactions/${id}`, undefined, {}),

  summary: async (year?: number, month?: number) => {
    const query = new URLSearchParams();
    if (year) query.set('year', String(year));
    if (month) query.set('month', String(month));
    const qs = query.toString();
    // For summary, don't cache locally cleanly, just fail if offline, or calculate locally.
    // We'll calculate locally if offline:
    if (!navigator.onLine) {
        const cached = await getCache('transactions') as Transaction[];
        let total_income = 0;
        let total_expense = 0;
        cached.forEach(t => {
            const d = new Date(t.transaction_date);
            if (year && month && (d.getFullYear() !== year || d.getMonth() + 1 !== month)) return;
            if (t.type === 'income') total_income += parseFloat(t.amount);
            if (t.type === 'expense') total_expense += parseFloat(t.amount);
        });
        return {
            month: `${year}-${String(month).padStart(2,'0')}-01`,
            total_income: String(total_income),
            total_expense: String(total_expense),
            balance: String(total_income - total_expense)
        } as TransactionSummary;
    }
    return request<TransactionSummary>(`/transactions/summary${qs ? `?${qs}` : ''}`);
  },
};

// ── Debts ─────────────────────────────────────────────────────

export interface DebtPayment {
  id: number;
  debt_id: number;
  amount: string;
  payment_date: string;
  comment: string | null;
  created_at: string;
}

export interface Debt {
  id: number;
  counterpart_id: number | null;
  counterpart_name: string | null;
  direction: 'gave' | 'took';
  amount: string;
  paid_amount: string;
  currency: string;
  comment: string | null;
  raw_text: string | null;
  client_id: string | null;
  debt_date: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
  payments: DebtPayment[];
}

export const debts = {
  list: async (params?: { is_closed?: boolean; direction?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v));
      });
    }
    const qs = query.toString();
    try {
        return await getWithCache<Debt[]>(`/debts${qs ? `?${qs}` : ''}`, 'debts');
    } catch {
        toast.error('Ошибка загрузки долгов, показаны кэшированные данные');
        const cached = await getCache('debts') as Debt[];
        return cached.filter(d => {
            if (params?.is_closed !== undefined && d.is_closed !== params.is_closed) return false;
            if (params?.direction && d.direction !== params.direction) return false;
            return true;
        });
    }
  },

  create: (data: {
    direction: string;
    amount: number;
    debt_date: string;
    counterpart_id?: number;
    comment?: string;
    client_id?: string;
    currency?: string;
  }) =>
    mutateOffline<Debt>('POST', '/debts', data, { id: -Date.now(), ...data, is_closed: false, paid_amount: "0", payments: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),

  update: (id: number, data: Partial<Debt>) =>
    mutateOffline<Debt>('PUT', `/debts/${id}`, data, { id, ...data }),

  delete: (id: number) =>
    mutateOffline('DELETE', `/debts/${id}`, undefined, {}),

  addPayment: (debtId: number, data: { amount: number; payment_date: string; comment?: string }) =>
    mutateOffline<DebtPayment>('POST', `/debts/${debtId}/payments`, data, { id: -Date.now(), debt_id: debtId, ...data, created_at: new Date().toISOString() }),
};

// ── Settings ─────────────────────────────────────────────────

export interface UserSettings {
  id: number;
  custom_prompt: string | null;
  theme: 'dark' | 'light';
}

export const settings = {
  get: () => getWithCache<UserSettings>('/settings', 'settings'),

  update: (data: { custom_prompt?: string; theme?: string }) =>
    mutateOffline<UserSettings>('PUT', '/settings', data, { id: 1, ...data } as UserSettings),
};

// ── AI ───────────────────────────────────────────────────────

export interface AiParseResult {
  status: 'ok' | 'incomplete' | 'rejected';
  message?: string;
  missing?: string[];
  type?: string;
  amount?: number;
  currency?: string;
  category_id?: number;
  category_name?: string;
  category_is_new?: boolean;
  counterpart_id?: number;
  counterpart_name?: string;
  counterpart_is_new?: boolean;
  comment?: string;
  date?: string;
  raw_text?: string;
}

export const ai = {
  parse: (text: string) => {
    const formData = new FormData();
    formData.append('text', text);
    return request<AiParseResult>('/ai/parse', {
      method: 'POST',
      body: formData,
    }); // This fails if offline, which is correct
  },

  parseAudio: (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    return request<AiParseResult>('/ai/parse-audio', {
      method: 'POST',
      body: formData,
    }); // Fails if offline
  },
};
