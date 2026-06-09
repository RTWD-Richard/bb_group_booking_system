import { describe, it, expect } from 'vitest';
import { rangesOverlap } from '../netlify/functions/utils/availability';

const d = (s: string) => new Date(s);

describe('rangesOverlap', () => {
  it('detects a full overlap', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-02'), d('2026-07-04'))).toBe(true);
  });

  it('detects a partial overlap at the start', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-06-28'), d('2026-07-02'))).toBe(true);
  });

  it('detects a partial overlap at the end', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-04'), d('2026-07-08'))).toBe(true);
  });

  it('detects identical ranges', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-01'), d('2026-07-05'))).toBe(true);
  });

  it('allows back-to-back bookings (check-in on the other booking\'s check-out day)', () => {
    // Guest A leaves on the 5th, Guest B arrives on the 5th. This must be allowed.
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-05'), d('2026-07-08'))).toBe(false);
    expect(rangesOverlap(d('2026-07-05'), d('2026-07-08'), d('2026-07-01'), d('2026-07-05'))).toBe(false);
  });

  it('allows clearly separate ranges', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-10'), d('2026-07-12'))).toBe(false);
  });
});
