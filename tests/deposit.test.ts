import { describe, it, expect } from 'vitest';
import { calculateDeposit } from '../src/lib/deposit';

describe('calculateDeposit', () => {
  it('returns the fixed amount in amount mode', () => {
    expect(calculateDeposit({ total: 500, mode: 'amount', amount: 75, percentage: 20 })).toBe(75);
  });

  it('returns a percentage of the total in percentage mode', () => {
    expect(calculateDeposit({ total: 500, mode: 'percentage', amount: 0, percentage: 20 })).toBe(100);
  });

  it('handles a zero total in percentage mode', () => {
    expect(calculateDeposit({ total: 0, mode: 'percentage', amount: 0, percentage: 20 })).toBe(0);
  });

  it('never returns a negative deposit', () => {
    expect(calculateDeposit({ total: 500, mode: 'amount', amount: -10, percentage: 20 })).toBe(0);
    expect(calculateDeposit({ total: 500, mode: 'percentage', amount: 0, percentage: -5 })).toBe(0);
  });

  it('caps the deposit at the booking total', () => {
    expect(calculateDeposit({ total: 100, mode: 'amount', amount: 250, percentage: 20 })).toBe(100);
    expect(calculateDeposit({ total: 100, mode: 'percentage', amount: 0, percentage: 150 })).toBe(100);
  });
});
