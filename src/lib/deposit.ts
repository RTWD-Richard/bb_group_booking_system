export type DepositMode = 'amount' | 'percentage';

export function calculateDeposit(opts: {
  total: number;
  mode: DepositMode;
  amount: number;
  percentage: number;
}): number {
  const raw = opts.mode === 'amount' ? opts.amount : (opts.total * opts.percentage) / 100;
  return Math.min(Math.max(raw, 0), Math.max(opts.total, 0));
}
