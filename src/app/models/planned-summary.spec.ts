import { planned } from '../testing/api-fixtures';
import { Frequency } from './frequency.model';
import { occurrencesPerMonth, summarizePlanned } from './planned-summary';

const TODAY = '2026-11-10';

function freq(overrides: Partial<Frequency>): Frequency {
  return {
    intervalUnit: 'MONTH',
    intervalCount: 1,
    dayOfWeek: null,
    dayOfMonth: 1,
    month: null,
    description: '',
    ...overrides,
  };
}

describe('occurrencesPerMonth', () => {
  it('spreads each unit over an average month', () => {
    expect(occurrencesPerMonth(freq({ intervalUnit: 'MONTH' }))).toBe(1);
    expect(occurrencesPerMonth(freq({ intervalUnit: 'MONTH', intervalCount: 3 }))).toBeCloseTo(
      1 / 3,
    );
    expect(occurrencesPerMonth(freq({ intervalUnit: 'YEAR' }))).toBeCloseTo(1 / 12);
    expect(occurrencesPerMonth(freq({ intervalUnit: 'WEEK' }))).toBeCloseTo(4.348, 3);
    expect(occurrencesPerMonth(freq({ intervalUnit: 'WEEK', intervalCount: 2 }))).toBeCloseTo(
      2.174,
      3,
    );
    expect(occurrencesPerMonth(freq({ intervalUnit: 'DAY' }))).toBeCloseTo(30.44, 2);
  });
});

describe('summarizePlanned', () => {
  it('averages income and expenses per month and nets them', () => {
    const s = summarizePlanned(
      [
        planned(1, {
          type: 'INCOME',
          amount: 2000,
          frequency: freq({ intervalUnit: 'WEEK', intervalCount: 2 }),
        }),
        planned(2, { type: 'EXPENSE', amount: 1500 }),
        planned(3, { type: 'EXPENSE', amount: 1200, frequency: freq({ intervalUnit: 'YEAR' }) }),
      ],
      null,
      TODAY,
    );
    expect(s.income).toBe(4348);
    expect(s.expenses).toBe(1600);
    expect(s.net).toBe(2748);
    expect(s.recurringCount).toBe(3);
  });

  it('leaves out one-time and ended transactions', () => {
    const s = summarizePlanned(
      [
        planned(1, { frequency: null, oneTime: true, startDate: '2026-12-01' }),
        planned(3, { endDate: '2026-11-09' }),
        planned(4, { endDate: '2026-11-10', amount: 100 }),
      ],
      null,
      TODAY,
    );
    expect(s.expenses).toBe(100);
    expect(s.recurringCount).toBe(1);
  });

  it('reports transfers as money moved across all accounts, without changing the net', () => {
    const s = summarizePlanned(
      [planned(1, { type: 'TRANSFER', amount: 300, accountId: 1, targetAccountId: 2 })],
      null,
      TODAY,
    );
    expect(s).toMatchObject({ transfersMoved: 300, transfersIn: 0, transfersOut: 0, net: 0 });
  });

  it('counts transfers in and out relative to one account', () => {
    const transfers = [
      planned(1, { type: 'TRANSFER', amount: 300, accountId: 1, targetAccountId: 2 }),
      planned(2, { type: 'TRANSFER', amount: 50, accountId: 3, targetAccountId: 1 }),
    ];
    expect(summarizePlanned(transfers, 1, TODAY)).toMatchObject({
      transfersIn: 50,
      transfersOut: 300,
      transfersMoved: 0,
      net: -250,
    });
    expect(summarizePlanned(transfers, 2, TODAY)).toMatchObject({ transfersIn: 300, net: 300 });
  });
});
