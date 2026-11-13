import { monthlyAmount } from './planned-summary';
import { PlannedTransaction } from './planned-transaction.model';

/** The chart has eight validated colours; categories past that fold into "Other". */
export const CATEGORY_COLOR_SLOTS = 8;

/** Slot 0–7 for a category's own colour; the two catch-all slices get neutral greys. */
export type SliceColor = number | 'other' | 'uncategorized';

export interface ExpenseSlice {
  key: string;
  name: string;
  /** Whole dollars per month. */
  amount: number;
  /** 0–1 of the total. */
  share: number;
  color: SliceColor;
}

/**
 * Gives the categories with the largest monthly expenses across *all* planned transactions a colour each. Built from
 * the unfiltered list so a category keeps its colour when filters change which slices are shown.
 */
export function categoryColorSlots(
  transactions: PlannedTransaction[],
  today: string,
): Map<number, number> {
  const totals = new Map<number, { name: string; amount: number }>();
  for (const t of transactions) {
    const monthly = monthlyAmount(t, today);
    if (t.type !== 'EXPENSE' || monthly === null || !t.category) {
      continue;
    }
    const entry = totals.get(t.category.id) ?? { name: t.category.name, amount: 0 };
    entry.amount += monthly;
    totals.set(t.category.id, entry);
  }
  const ranked = [...totals.entries()].sort(
    ([, a], [, b]) => b.amount - a.amount || a.name.localeCompare(b.name),
  );
  return new Map(ranked.slice(0, CATEGORY_COLOR_SLOTS).map(([id], slot) => [id, slot]));
}

/**
 * Monthly expenses (recurring, not ended) split by category, largest first, with "Other" and "Uncategorized" last.
 * Empty when no categorized expense is left, since a pie of only "Uncategorized" says nothing.
 */
export function expensesByCategory(
  transactions: PlannedTransaction[],
  colorSlots: Map<number, number>,
  today: string,
): ExpenseSlice[] {
  const sums = new Map<string, { name: string; amount: number; color: SliceColor }>();
  const add = (key: string, name: string, color: SliceColor, amount: number) => {
    const entry = sums.get(key) ?? { name, amount: 0, color };
    entry.amount += amount;
    sums.set(key, entry);
  };

  for (const t of transactions) {
    const monthly = monthlyAmount(t, today);
    if (t.type !== 'EXPENSE' || monthly === null) {
      continue;
    }
    const slot = t.category ? colorSlots.get(t.category.id) : undefined;
    if (!t.category) {
      add('uncategorized', 'Uncategorized', 'uncategorized', monthly);
    } else if (slot === undefined) {
      add('other', 'Other categories', 'other', monthly);
    } else {
      add(`category-${t.category.id}`, t.category.name, slot, monthly);
    }
  }

  const slices = [...sums.entries()]
    .map(([key, s]) => ({ key, name: s.name, color: s.color, amount: Math.round(s.amount) }))
    .filter((s) => s.amount > 0);
  if (!slices.some((s) => typeof s.color === 'number')) {
    return [];
  }

  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const rank = (s: { color: SliceColor }) =>
    typeof s.color === 'number' ? 0 : s.color === 'other' ? 1 : 2;
  return slices
    .sort((a, b) => rank(a) - rank(b) || b.amount - a.amount || a.name.localeCompare(b.name))
    .map((s) => ({ ...s, share: s.amount / total }));
}
