import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp } from 'lucide-react';
import { TransactionList } from '../components/TransactionList';
import './Transactions.css';

type TabType = 'all' | 'income' | 'expense';

export function Transactions() {
  const [tab, setTab] = useState<TabType>('all');

  return (
    <div className="page container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title">
          <ArrowDownUp size={24} style={{ color: 'var(--accent)', verticalAlign: 'middle', marginRight: 8 }} />
          Операции
        </h1>
      </motion.div>

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

      <TransactionList type={tab === 'all' ? undefined : tab} />
    </div>
  );
}
