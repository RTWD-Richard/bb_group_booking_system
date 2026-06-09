import { describe, it, expect } from 'vitest';
import { calculateBookingTotal, calculateGroupTotal } from '../netlify/functions/utils/pricing';

const room = {
  id: 'room-1',
  name: 'Mermaid Room',
  singleRate: 80,
  doubleRate: 120,
} as any;

const booking = (overrides: object) => ({
  checkIn: new Date('2026-07-01'),
  checkOut: new Date('2026-07-04'), // 3 nights
  occupancyType: 'double',
  mealCost: 0,
  manualDiscount: 0,
  ...overrides,
} as any);

describe('calculateBookingTotal', () => {
  it('charges double rate x nights', () => {
    expect(calculateBookingTotal(booking({}), room)).toBe(360); // 120 x 3
  });

  it('charges single rate for single occupancy', () => {
    expect(calculateBookingTotal(booking({ occupancyType: 'single' }), room)).toBe(240); // 80 x 3
  });

  it('adds meal cost and subtracts discount', () => {
    expect(calculateBookingTotal(booking({ mealCost: 30, manualDiscount: 50 }), room)).toBe(340); // 360 + 30 - 50
  });

  it('treats null meal cost and discount as zero', () => {
    expect(calculateBookingTotal(booking({ mealCost: null, manualDiscount: null }), room)).toBe(360);
  });

  it('counts one night for a single-night stay', () => {
    expect(calculateBookingTotal(booking({ checkOut: new Date('2026-07-02') }), room)).toBe(120);
  });

  it('counts nights correctly across the October clock change', () => {
    // 2026-10-24 to 2026-10-26 spans BST -> GMT. ISO date strings parse as UTC
    // midnight so this should still be exactly 2 nights.
    expect(calculateBookingTotal(
      booking({ checkIn: new Date('2026-10-24'), checkOut: new Date('2026-10-26') }), room
    )).toBe(240);
  });
});

describe('calculateGroupTotal', () => {
  it('sums booking totals', () => {
    expect(calculateGroupTotal([100, 200, 300])).toBe(600);
  });

  it('subtracts the group discount', () => {
    expect(calculateGroupTotal([100, 200, 300], 50)).toBe(550);
  });

  it('handles an empty group', () => {
    expect(calculateGroupTotal([])).toBe(0);
  });
});
