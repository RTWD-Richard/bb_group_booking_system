import type { Room, RoomBooking } from '../../../src/db/schema';

export function calculateBookingTotal(booking: RoomBooking, room: Room): number {
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  
  const ratePerNight = booking.occupancyType === 'single' ? room.singleRate : room.doubleRate;
  const basePrice = ratePerNight * nights;
  
  return (basePrice + (booking.mealCost || 0)) - (booking.manualDiscount || 0);
}

export function calculateGroupTotal(bookingTotals: number[], groupDiscount: number = 0): number {
  const sum = bookingTotals.reduce((acc, total) => acc + total, 0);
  return sum - groupDiscount;
}
