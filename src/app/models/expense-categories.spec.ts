import { category, planned } from '../testing/api-fixtures';
import { categoryColorSlots, expensesByCategory } from './expense-categories';

const TODAY = '2026-11-10';
const yearly = {
  intervalUnit: 'YEAR' as const,
  intervalCount: 1,
  dayOfWeek: null,
  dayOfMonth: 1,
  month: 'JANUARY' as const,
  description: 'Yearly',
};

describe('categoryColorSlots', () => {
  it('ranks categories by monthly expense and gives only the top eight a colour', () => {
    const transactions = Array.from({ length: 9 }, (_, i) =>
      planned(i + 1, { amount: 100 * (i + 1), category: category(i + 1, `C${i + 1}`) }),
    );
    const slots = categoryColorSlots(transactions, TODAY);
    expect(slots.get(9)).toBe(0);
    expect(slots.get(2)).toBe(7);
    expect(slots.has(1)).toBe(false);
  });

  it('ignores income, one-time and uncategorized transactions', () => {
    const slots = categoryColorSlots(
      [
        planned(1, { type: 'INCOME', category: category(1, 'Cat 1') }),
        planned(2, { frequency: null, oneTime: true, category: category(2, 'Cat 2') }),
        planned(3),
      ],
      TODAY,
    );
    expect(slots.size).toBe(0);
  });
});

describe('expensesByCategory', () => {
  it('sums monthly amounts per category, largest first, with catch-alls last', () => {
    const food = category(1, 'Food');
    const home = category(2, 'Home');
    const transactions = [
      planned(1, { amount: 300, category: food }),
      planned(2, { amount: 1200, category: food, frequency: yearly }),
      planned(3, { amount: 1500, category: home }),
      planned(4, { amount: 50 }),
      planned(5, { amount: 20, category: category(3, 'Pets') }),
    ];
    const slots = new Map([
      [2, 0],
      [1, 1],
    ]);
    expect(expensesByCategory(transactions, slots, TODAY)).toEqual([
      { key: 'category-2', name: 'Home', amount: 1500, color: 0, share: 1500 / 1970 },
      { key: 'category-1', name: 'Food', amount: 400, color: 1, share: 400 / 1970 },
      { key: 'other', name: 'Other categories', amount: 20, color: 'other', share: 20 / 1970 },
      {
        key: 'uncategorized',
        name: 'Uncategorized',
        amount: 50,
        color: 'uncategorized',
        share: 50 / 1970,
      },
    ]);
  });

  it('is empty when no expense has a category', () => {
    expect(expensesByCategory([planned(1), planned(2)], new Map(), TODAY)).toEqual([]);
  });

  it('leaves out ended expenses', () => {
    const transactions = [planned(1, { category: category(1, 'Cat 1'), endDate: '2026-01-01' })];
    expect(expensesByCategory(transactions, new Map([[1, 0]]), TODAY)).toEqual([]);
  });
});
