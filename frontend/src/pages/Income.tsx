import { TrendingUp } from 'lucide-react';
import { TransactionList } from '../components/TransactionList';

export function Income() {
  return (
    <div className="page container">
      <div
        className="page-header"
      >
        <h1 className="page-title">
          <TrendingUp size={24} style={{ color: 'var(--income)', verticalAlign: 'middle', marginRight: 8 }} />
          Доходы
        </h1>
        <p className="page-subtitle">Все поступления</p>
      </div>

      <TransactionList type="income" />
    </div>
  );
}
