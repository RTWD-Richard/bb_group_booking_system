// Two date ranges overlap if: start1 < end2 AND start2 < end1.
// Strict comparison so back-to-back bookings (check-out day = check-in day) are allowed.
export function rangesOverlap(
  checkIn1: Date,
  checkOut1: Date,
  checkIn2: Date,
  checkOut2: Date
): boolean {
  return checkIn1 < checkOut2 && checkIn2 < checkOut1;
}
