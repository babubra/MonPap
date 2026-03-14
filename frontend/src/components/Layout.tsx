import { NavLink, Outlet } from 'react-router-dom';
import { Home, TrendingUp, TrendingDown, Landmark, BookMarked, Settings } from 'lucide-react';
import { OfflineIndicator } from './OfflineIndicator';
import './Layout.css';

const navItems = [
  { to: '/', icon: Home, label: 'Главная' },
  { to: '/income', icon: TrendingUp, label: 'Доходы' },
  { to: '/expenses', icon: TrendingDown, label: 'Расходы' },
  { to: '/debts', icon: Landmark, label: 'Долги' },
  { to: '/references', icon: BookMarked, label: 'Данные' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
];

export function Layout() {
  return (
    <div className="layout">
      <OfflineIndicator />
      <main className="layout-content">
        <Outlet />
      </main>
      <nav className="navbar glass">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `navbar-item ${isActive ? 'navbar-item--active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="navbar-label">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
