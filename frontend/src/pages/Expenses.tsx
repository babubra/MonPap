import { TrendingDown } from 'lucide-react';
import { TransactionList } from '../components/TransactionList';

export function Expenses() {
  return (
    <div className="page container">
      <div
        className="page-header"
      >
        <h1 className="page-title">
          <TrendingDown size={24} style={{ color: 'var(--expense)', verticalAlign: 'middle', marginRight: 8 }} />
          Расходы
        </h1>
        <p className="page-subtitle">Все траты</p>
      </div>

      <TransactionList type="expense" />
    </div>
  );
}
