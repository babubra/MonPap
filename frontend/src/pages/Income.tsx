import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { TransactionList } from '../components/TransactionList';

export function Income() {
  return (
    <div className="page container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title">
          <TrendingUp size={24} style={{ color: 'var(--income)', verticalAlign: 'middle', marginRight: 8 }} />
          Доходы
        </h1>
        <p className="page-subtitle">Все поступления</p>
      </motion.div>

      <TransactionList type="income" />
    </div>
  );
}
