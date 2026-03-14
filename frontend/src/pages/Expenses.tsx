import { motion } from 'framer-motion';
import { TrendingDown } from 'lucide-react';
import { TransactionList } from '../components/TransactionList';

export function Expenses() {
  return (
    <div className="page container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title">
          <TrendingDown size={24} style={{ color: 'var(--expense)', verticalAlign: 'middle', marginRight: 8 }} />
          Расходы
        </h1>
        <p className="page-subtitle">Все траты</p>
      </motion.div>

      <TransactionList type="expense" />
    </div>
  );
}
