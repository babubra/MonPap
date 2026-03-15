import {
  transactions as txApi,
  categories as catApi,
  counterparts as cpApi,
  debts as debtsApi,
} from '../api';
import type { ParsedData } from '../components/ParsePreview';
import toast from 'react-hot-toast';

/**
 * Хук или утилита для сохранения транзакций (в том числе из результатов AI парсинга).
 * Берет на себя логику создания связанных сущностей (категорий, субъектов).
 */
export function useTransactionMutations() {
  /**
   * Сохраняет результат AI-парсинга. Если AI вернул текст новой категории
   * или субъекта (которых нет в БД), метод попытается их создать перед
   * сохранением самой транзакции.
   *
   * @param data Отредактированные данные из ParsePreview
   */
  async function saveParsedTransaction(data: ParsedData): Promise<void> {
    // 1. Авто-создание нового субъекта если AI распознал нового
    let counterpartId = data.counterpart_id;
    if (!counterpartId && data.counterpart_name) {
      try {
        const created = await cpApi.create({ name: data.counterpart_name });
        counterpartId = created.id;
      } catch (e: any) {
        // Субъект не создался — логируем и показываем пользователю
        console.error('Failed to auto-create counterpart', data.counterpart_name);
        toast.error(`Не удалось создать контрагента "${data.counterpart_name}": ` + e.message);
      }
    }

    // 2. Авто-создание новой категории если AI распознал новую
    let categoryId = data.category_id;
    if (!categoryId && data.category_name && (data.type === 'income' || data.type === 'expense')) {
      try {
        const created = await catApi.create({ name: data.category_name, type: data.type });
        categoryId = created.id;
      } catch (e: any) {
        // Категория не создалась
        console.error('Failed to auto-create category', data.category_name);
        toast.error(`Не удалось создать категорию "${data.category_name}": ` + e.message);
      }
    }

    // 3. Сохранение самой транзакции в зависимости от типа
    if (data.type === 'income' || data.type === 'expense') {
      await txApi.create({
        type: data.type,
        amount: data.amount,
        transaction_date: data.date,
        category_id: categoryId || undefined,
        comment: data.raw_text || data.comment || undefined,
        raw_text: data.raw_text || undefined,
        currency: data.currency,
      });
    } else if (data.type === 'debt_give' || data.type === 'debt_take') {
      await debtsApi.create({
        direction: data.type === 'debt_give' ? 'gave' : 'took',
        amount: data.amount,
        debt_date: data.date,
        counterpart_id: counterpartId || undefined,
        comment: data.raw_text || data.comment || undefined,
        currency: data.currency,
      });
    } else if (data.type === 'debt_payment') {
      if (!data.debt_id) throw new Error('Не выбран долг для оплаты');
      await debtsApi.addPayment(data.debt_id, {
        amount: data.amount,
        payment_date: data.date,
        comment: data.raw_text || data.comment || undefined,
      });
    }
  }

  return {
    saveParsedTransaction,
  };
}
