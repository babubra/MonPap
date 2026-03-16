/**
 * Универсальная группировка элементов по дате.
 * Используется для транзакций и долгов.
 */

interface Identifiable {
  id: number;
}

interface DateGroup<T> {
  date: string;
  label: string;
  items: T[];
}

/**
 * Группирует элементы по дате, возвращает отсортированный массив групп.
 *
 * @param items — массив элементов
 * @param getDate — функция, извлекающая дату из элемента (строка ISO или YYYY-MM-DD)
 */
export function groupByDate<T extends Identifiable>(
  items: T[],
  getDate: (item: T) => string,
): DateGroup<T>[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const fmtKey = (d: Date) => d.toISOString().split('T')[0];
  const todayKey = fmtKey(today);
  const yesterdayKey = fmtKey(yesterday);

  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getDate(item).split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, group]) => {
      // Сортируем внутри дня: сначала новые (по дате, затем по id)
      group.sort((a, b) => {
        const timeDiff = new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id - a.id;
      });

      let label: string;
      if (date === todayKey) label = 'Сегодня';
      else if (date === yesterdayKey) label = 'Вчера';
      else label = new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      return { date, label, items: group };
    });
}
