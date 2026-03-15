/**
 * Stats — модуль статистики: графики доходов/расходов по категориям, 
 * выбор периодов, таблица-рейтинг.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { stats as statsApi, type CategoryStatsItem, type StatsResponse } from '../api';
import { useShowAmounts } from '../hooks/useShowAmounts';
import { PullToRefresh } from '../components/PullToRefresh';
import toast from 'react-hot-toast';
import './Stats.css';

// ── Утилиты для работы с периодами ──────────────────────

type PeriodType = 'month' | 'quarter' | 'year';

interface Period {
  type: PeriodType;
  year: number;
  month?: number;   // 1-12 для month
  quarter?: number;  // 1-4 для quarter
}

function getPeriodDates(period: Period): { from: string; to: string } {
  const { type, year } = period;
  switch (type) {
    case 'month': {
      const m = period.month!;
      const from = `${year}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(year, m, 0).getDate();
      const to = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { from, to };
    }
    case 'quarter': {
      const q = period.quarter!;
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      const from = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(year, endMonth, 0).getDate();
      const to = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { from, to };
    }
    case 'year': {
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
  }
}

function formatPeriodLabel(period: Period): string {
  switch (period.type) {
    case 'month':
      return new Date(period.year, (period.month || 1) - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    case 'quarter':
      return `${period.quarter} квартал ${period.year}`;
    case 'year':
      return String(period.year);
  }
}

function shiftPeriod(period: Period, direction: -1 | 1): Period {
  switch (period.type) {
    case 'month': {
      let m = (period.month || 1) + direction;
      let y = period.year;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      return { ...period, year: y, month: m };
    }
    case 'quarter': {
      let q = (period.quarter || 1) + direction;
      let y = period.year;
      if (q < 1) { q = 4; y--; }
      if (q > 4) { q = 1; y++; }
      return { ...period, year: y, quarter: q };
    }
    case 'year':
      return { ...period, year: period.year + direction };
  }
}

// ── Палитра цветов для столбцов ─────────────────────────

const INCOME_COLORS = [
  '#5ee8b7', '#4dd4a8', '#3cc099', '#2bac8a', '#1a987b',
  '#6ef0c2', '#7ef8cd', '#8effd8', '#4ecaa3', '#3eb894',
];

const EXPENSE_COLORS = [
  '#ff7eb3', '#f06292', '#ec407a', '#e91e63', '#d81b60',
  '#ff8fbe', '#ffa0c9', '#ffb1d4', '#e57399', '#d4648e',
];

// ── Форматирование суммы ────────────────────────────────

function formatShortAmount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(Math.round(value));
}

function formatFullAmount(value: number | string): string {
  return Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Custom Tooltip ──────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string; icon: string | null } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, icon } = payload[0].payload;
  return (
    <div className="stats-tooltip">
      <div className="stats-tooltip-label">
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
        {name}
      </div>
      <div className="stats-tooltip-value">
        {formatFullAmount(payload[0].value)} ₽
      </div>
    </div>
  );
}

// ── Компонент ───────────────────────────────────────────

export function Stats() {
  const now = new Date();
  const [tab, setTab] = useState<'income' | 'expense'>('expense');
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [period, setPeriod] = useState<Period>({
    type: 'month',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { showAmounts, formatAmount } = useShowAmounts();

  // Обновляем period при смене типа периода
  function handlePeriodTypeChange(type: PeriodType) {
    setPeriodType(type);
    const now = new Date();
    switch (type) {
      case 'month':
        setPeriod({ type, year: now.getFullYear(), month: now.getMonth() + 1 });
        break;
      case 'quarter':
        setPeriod({ type, year: now.getFullYear(), quarter: Math.ceil((now.getMonth() + 1) / 3) });
        break;
      case 'year':
        setPeriod({ type, year: now.getFullYear() });
        break;
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getPeriodDates(period);
      const result = await statsApi.byCategory({ type: tab, date_from: from, date_to: to });
      setData(result);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  }, [tab, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Данные для графика
  const chartData = (data?.items || []).map((item: CategoryStatsItem) => ({
    name: item.category_name,
    value: Number(item.total),
    icon: item.icon,
  }));

  const colors = tab === 'income' ? INCOME_COLORS : EXPENSE_COLORS;
  const totalSum = Number(data?.total_sum || 0);

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="page container">
      <div className="page-header">
        <h1 className="page-title">Статистика</h1>
      </div>

      {/* Табы Доходы/Расходы */}
      <div className="stats-tabs">
        <button
          className={`stats-tab ${tab === 'income' ? 'stats-tab--active' : ''}`}
          onClick={() => setTab('income')}
        >
          Доходы
        </button>
        <button
          className={`stats-tab ${tab === 'expense' ? 'stats-tab--active' : ''}`}
          onClick={() => setTab('expense')}
        >
          Расходы
        </button>
      </div>

      {/* Тип периода */}
      <div className="period-type-selector">
        {(['month', 'quarter', 'year'] as PeriodType[]).map((t) => (
          <button
            key={t}
            className={`period-type-btn ${periodType === t ? 'period-type-btn--active' : ''}`}
            onClick={() => handlePeriodTypeChange(t)}
          >
            {t === 'month' ? 'Месяц' : t === 'quarter' ? 'Квартал' : 'Год'}
          </button>
        ))}
      </div>

      {/* Навигация по периоду */}
      <div className="period-selector">
        <button
          className="period-nav-btn"
          onClick={() => setPeriod(shiftPeriod(period, -1))}
          aria-label="Предыдущий период"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="period-label">{formatPeriodLabel(period)}</span>
        <button
          className="period-nav-btn"
          onClick={() => setPeriod(shiftPeriod(period, 1))}
          aria-label="Следующий период"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Загрузка */}
      {loading ? (
        <div className="stats-loading">
          <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
        </div>
      ) : chartData.length === 0 ? (
        /* Пустое состояние */
        <div className="stats-empty glass-card">
          <div className="stats-empty-icon">
            <BarChart3 size={48} />
          </div>
          <p className="stats-empty-text">
            Нет данных за выбранный период
          </p>
        </div>
      ) : (
        <>
          {/* Итого */}
          <div className="stats-total">
            <span className="stats-total-label">
              {tab === 'income' ? 'Всего доходов' : 'Всего расходов'}
            </span>
            <span className={`stats-total-amount ${tab === 'income' ? 'text-income' : 'text-expense'}`}>
              {showAmounts ? `${formatFullAmount(totalSum)} ₽` : '••••••'}
            </span>
          </div>

          {/* График */}
          <div className="stats-chart-card glass-card">
            <div className="stats-chart-title">
              {tab === 'income' ? 'Доходы' : 'Расходы'} по категориям
            </div>
            <div className="stats-chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={formatShortAmount}
                    tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(name: string) => {
                      const item = chartData.find(d => d.name === name);
                      const icon = item?.icon ? `${item.icon} ` : '';
                      return `${icon}${name.length > 10 ? name.slice(0, 10) + '…' : name}`;
                    }}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'var(--accent-subtle)', radius: 4 }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {chartData.map((_entry, index) => (
                      <Cell key={index} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Таблица-рейтинг */}
          <div className="stats-ranking glass-card">
            <div className="stats-ranking-title">
              Топ {tab === 'income' ? 'доходных' : 'затратных'} категорий
            </div>
            <div className="stats-ranking-list">
              {chartData.map((item, index) => {
                const percent = totalSum > 0 ? (item.value / totalSum * 100) : 0;
                const barColor = colors[index % colors.length];
                return (
                  <div key={index} className="stats-ranking-item">
                    <div
                      className={`stats-ranking-position ${index < 3 ? `stats-ranking-position--${index + 1}` : ''}`}
                      style={index >= 3 ? { background: 'var(--bg-input-focus)', color: 'var(--text-tertiary)' } : undefined}
                    >
                      {index + 1}
                    </div>
                    {item.icon && <span className="stats-ranking-icon">{item.icon}</span>}
                    <div className="stats-ranking-info">
                      <div className="stats-ranking-name">{item.name}</div>
                      <div
                        className="stats-ranking-bar"
                        style={{ width: `${Math.max(percent, 2)}%`, background: barColor }}
                      />
                    </div>
                    <div className="stats-ranking-amount">
                      <span className="amount">{formatAmount(String(item.value))} ₽</span>
                      <span className="stats-ranking-percent">{percent.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
    </PullToRefresh>
  );
}
