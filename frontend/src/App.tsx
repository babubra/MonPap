import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, setOnUnauthorized, settings as settingsApi, setToken } from './api';
import { Layout } from './components/Layout';
import './lib/syncManager';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Transactions } from './pages/Transactions';
import { Debts } from './pages/Debts';
import { References } from './pages/References';
import { Settings } from './pages/Settings';
import { LockScreen } from './components/LockScreen';

function App() {
  // Проверяем ?access_token= из Magic Link редиректа
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('access_token');
  if (tokenFromUrl) {
    setToken(tokenFromUrl);
    // Очищаем URL от токена
    window.history.replaceState({}, '', '/');
  }

  const [authed, setAuthed] = useState(isAuthenticated());
  const [themeReady, setThemeReady] = useState(false);

  // Устанавливаем тему при старте
  useEffect(() => {
    const saved = localStorage.getItem('monpap_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeReady(true);

    // Подтягиваем серверную тему если залогинены
    if (isAuthenticated()) {
      settingsApi.get().then(s => {
        document.documentElement.setAttribute('data-theme', s.theme);
        localStorage.setItem('monpap_theme', s.theme);
      }).catch(() => {/* оффлайн */});
    }
  }, [authed]);

  // Колбэк на 401
  useEffect(() => {
    setOnUnauthorized(() => setAuthed(false));
  }, []);

  if (!themeReady) return null;

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }

  return (
    <>
      <LockScreen />
      <BrowserRouter>
        <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/references" element={<References />} />
          <Route path="/settings" element={<Settings onLogout={() => setAuthed(false)} />} />
          {/* Обратная совместимость со старыми URL */}
          <Route path="/income" element={<Navigate to="/transactions" replace />} />
          <Route path="/expenses" element={<Navigate to="/transactions" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}

export default App;
