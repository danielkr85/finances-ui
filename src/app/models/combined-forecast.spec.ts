import { account } from '../testing/api-fixtures';
import { COMBINED_ACCOUNT_ID, combineForecasts, isCombinedEvent } from './combined-forecast';
import { FinancialEvent, Forecast, Projection } from './forecast.model';

const checking = account(1, 'Checking');
const savings = account(2, 'Savings', { type: 'SAVINGS' });
const amex = account(3, 'Amex', { type: 'CREDIT_CARD' });

describe('combineForecasts', () => {
  it('adds cash and subtracts what cards owe', () => {
    const result = combineForecasts([
      { account: checking, forecast: forecast(1, 2000, []) },
      { account: savings, forecast: forecast(2, 5000, []) },
      { account: amex, forecast: forecast(3, 800, []) },
    ]);
    expect(result.accountId).toBe(COMBINED_ACCOUNT_ID);
    expect(result.openingBalance).toBe(6200);
    expect(result.finalBalance).toBe(6200);
    expect(result.projections).toEqual([]);
  });

  it('counts spending on a card as money out, and a card refund as money in', () => {
    const result = combineForecasts([
      { account: checking, forecast: forecast(1, 1000, []) },
      {
        account: amex,
        forecast: forecast(3, 0, [
          day('2030-01-02', [ev(3, 'Dinner', 70, 'CREDIT', 'EXPENSE')]),
          day('2030-01-03', [ev(3, 'Refund', 20, 'DEBIT', 'INCOME')]),
        ]),
      },
    ]);
    expect(result.projections.map((p) => [p.date, p.amountChange, p.resultingBalance])).toEqual([
      ['2030-01-02', -70, 930],
      ['2030-01-03', 20, 950],
    ]);
    const dinner = result.projections[0].events[0];
    expect(dinner).toMatchObject({ amount: 70, direction: 'DEBIT', accountId: 0 });
    expect(isCombinedEvent(dinner) && dinner.sourceAccountId).toBe(3);
  });

  it('drops a transfer between two included accounts (it changes nothing in total)', () => {
    // Paying the card: checking -500, and the card's debt -500, which is +500 to the net.
    const payment = (accountId: number) =>
      ev(accountId, 'Amex payment', 500, 'DEBIT', 'TRANSFER', 9);
    const result = combineForecasts([
      {
        account: checking,
        forecast: forecast(1, 1000, [
          day('2030-01-13', [payment(1), payment(3), ev(1, 'Paycheck', 2000, 'CREDIT', 'INCOME')]),
        ]),
      },
      { account: amex, forecast: forecast(3, 500, [day('2030-01-13', [payment(1), payment(3)])]) },
    ]);
    expect(result.projections).toHaveLength(1);
    expect(result.projections[0].events.map((e) => e.description)).toEqual(['Paycheck']);
    expect(result.openingBalance).toBe(500);
    expect(result.finalBalance).toBe(2500);
  });

  it('keeps a transfer whose other account is left out', () => {
    const toSavings = (accountId: number, direction: 'DEBIT' | 'CREDIT') =>
      ev(accountId, 'Savings', 200, direction, 'TRANSFER', 4);
    const result = combineForecasts([
      {
        account: checking,
        forecast: forecast(1, 1000, [
          day('2030-01-05', [toSavings(1, 'DEBIT'), toSavings(2, 'CREDIT')]),
        ]),
      },
    ]);
    expect(result.projections.map((p) => [p.amountChange, p.resultingBalance])).toEqual([
      [-200, 800],
    ]);
  });

  it("merges dates across accounts in order, and ends at the sum of each account's final balance", () => {
    const result = combineForecasts([
      {
        account: checking,
        forecast: forecast(1, 1000, [day('2030-01-10', [ev(1, 'Rent', 900, 'DEBIT', 'EXPENSE')])]),
      },
      {
        account: savings,
        forecast: forecast(2, 3000, [
          day('2030-01-01', [ev(2, 'Interest', 10, 'CREDIT', 'INCOME')]),
        ]),
      },
    ]);
    expect(result.projections.map((p) => p.date)).toEqual(['2030-01-01', '2030-01-10']);
    expect(result.finalBalance).toBe(1000 - 900 + 3000 + 10);
  });
});

function forecast(accountId: number, openingBalance: number, projections: Projection[]): Forecast {
  return {
    accountId,
    from: '2030-01-01',
    to: '2030-03-31',
    openingBalance,
    projections,
    finalBalance: 0, // not used: the combined final balance is computed from the events
  };
}

function day(date: string, events: FinancialEvent[]): Projection {
  return { date, amountChange: 0, resultingBalance: 0, events };
}

function ev(
  accountId: number,
  description: string,
  amount: number,
  direction: 'DEBIT' | 'CREDIT',
  eventType: 'INCOME' | 'EXPENSE' | 'TRANSFER',
  plannedTransactionId = accountId * 100,
): FinancialEvent {
  return {
    description,
    amount,
    eventDate: '2030-01-01',
    eventType,
    direction,
    accountId,
    category: null,
    plannedTransactionId,
  };
}
