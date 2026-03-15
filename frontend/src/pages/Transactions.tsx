import { useState, useCallback } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { TransactionList } from '../components/TransactionList';
import { PullToRefresh } from '../components/PullToRefresh';
import './Transactions.css';

type TabType = 'all' | 'income' | 'expense';

export function Transactions() {
  const [tab, setTab] = useState<TabType>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="page container">
      <div
        className="page-header"
      >
        <h1 className="page-title">
          <ArrowDownUp size={24} style={{ color: 'var(--accent)', verticalAlign: 'middle', marginRight: 8 }} />
          Операции
        </h1>
      </div>

      {/* Табы */}
      <div className="tx-tabs">
        <button
          className={`tx-tab ${tab === 'all' ? 'tx-tab--active' : ''}`}
          onClick={() => setTab('all')}
        >
          Все
        </button>
        <button
          className={`tx-tab tx-tab--income ${tab === 'income' ? 'tx-tab--active' : ''}`}
          onClick={() => setTab('income')}
        >
          Доходы
        </button>
        <button
          className={`tx-tab tx-tab--expense ${tab === 'expense' ? 'tx-tab--active' : ''}`}
          onClick={() => setTab('expense')}
        >
          Расходы
        </button>
      </div>

      <TransactionList key={refreshKey} type={tab === 'all' ? undefined : tab} />
    </div>
    </PullToRefresh>
  );
}
