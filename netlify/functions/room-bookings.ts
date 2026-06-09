import type { Handler } from '@netlify/functions';
import { eq, and, lte, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './utils/db';
import { corsHeaders, handleCors } from './utils/cors';
import { calculateBookingTotal } from './utils/pricing';
import { rangesOverlap } from './utils/availability';
import { roomBookings, rooms } from '../../src/db/schema';

// Check if room is available for the date range
async function checkAvailability(db: any, roomId: string, checkIn: Date, checkOut: Date, excludeBookingId?: string) {
  const existingBookings = await db.select().from(roomBookings).where(
    eq(roomBookings.roomId, roomId)
  );

  const conflicts = existingBookings.filter((b: any) =>
    b.id !== excludeBookingId &&
    rangesOverlap(checkIn, checkOut, new Date(b.checkIn), new Date(b.checkOut))
  );

  return conflicts.length === 0;
}

export const handler: Handler = async (event) => {
  const corsResponse = handleCors(event.httpMethod);
  if (corsResponse) return corsResponse;

  const db = getDb();

  try {
    // GET /api/room-bookings - List bookings with optional filters
    if (event.httpMethod === 'GET' && !event.path.includes('/room-bookings/')) {
      const { groupId, roomId, startDate, endDate } = event.queryStringParameters || {};
      
      let query = db.select().from(roomBookings);
      
      // Apply filters
      const conditions = [];
      if (groupId) conditions.push(eq(roomBookings.groupId, groupId));
      if (roomId) conditions.push(eq(roomBookings.roomId, roomId));
      if (startDate) conditions.push(gte(roomBookings.checkOut, new Date(startDate)));
      if (endDate) conditions.push(lte(roomBookings.checkIn, new Date(endDate)));
      
      let bookings;
      if (conditions.length > 0) {
        bookings = await db.select().from(roomBookings).where(and(...conditions));
      } else {
        bookings = await db.select().from(roomBookings);
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(bookings),
      };
    }

    // GET /api/room-bookings/:id - Get single booking
    if (event.httpMethod === 'GET') {
      const bookingId = event.path.split('/').pop();
      if (!bookingId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Booking ID required' }),
        };
      }

      const booking = await db.select().from(roomBookings).where(eq(roomBookings.id, bookingId));
      
      if (!booking.length) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Booking not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(booking[0]),
      };
    }

    // POST /api/room-bookings - Create single booking
    if (event.httpMethod === 'POST' && !event.path.includes('/bulk')) {
      const body = JSON.parse(event.body || '{}');
      
      const checkIn = new Date(body.checkIn);
      const checkOut = new Date(body.checkOut);

      // Check availability
      const isAvailable = await checkAvailability(db, body.roomId, checkIn, checkOut);
      
      if (!isAvailable) {
        return {
          statusCode: 409,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Room is not available for the selected dates' }),
        };
      }

      const newBooking = {
        id: uuidv4(),
        groupId: body.groupId,
        roomId: body.roomId,
        guestId: body.guestId || null,
        secondGuestId: body.secondGuestId || null,
        checkIn,
        checkOut,
        occupancyType: body.occupancyType,
        manualDiscount: body.manualDiscount || 0,
        mealCookedBreakfast: body.mealCookedBreakfast || false,
        mealContinentalBreakfast: body.mealContinentalBreakfast || false,
        mealPackedLunch: body.mealPackedLunch || false,
        mealCost: body.mealCost || 0,
        depositAmount: body.depositAmount || 0,
        depositPaid: body.depositPaid || false,
        balancePaid: body.balancePaid || false,
        paymentNotes: body.paymentNotes || '',
        createdAt: new Date(),
      };

      await db.insert(roomBookings).values(newBooking);
      
      // Get room details and calculate total
      const room = await db.select().from(rooms).where(eq(rooms.id, newBooking.roomId));
      const calculatedTotal = room.length > 0 
        ? calculateBookingTotal(newBooking as any, room[0])
        : 0;
      
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({ ...newBooking, calculatedTotal }),
      };
    }

    // POST /api/room-bookings/bulk - Create multiple bookings for a group
    if (event.httpMethod === 'POST' && event.path.includes('/bulk')) {
      const body = JSON.parse(event.body || '{}');
      const { bookings: bookingsData } = body;

      if (!Array.isArray(bookingsData) || bookingsData.length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Bookings array required' }),
        };
      }

      // Check availability for all bookings
      for (const bookingData of bookingsData) {
        const checkIn = new Date(bookingData.checkIn);
        const checkOut = new Date(bookingData.checkOut);
        const isAvailable = await checkAvailability(db, bookingData.roomId, checkIn, checkOut);
        
        if (!isAvailable) {
          const room = await db.select().from(rooms).where(eq(rooms.id, bookingData.roomId));
          return {
            statusCode: 409,
            headers: corsHeaders,
            body: JSON.stringify({ 
              error: `Room "${room[0]?.name}" is not available for the selected dates` 
            }),
          };
        }
      }

      // Create all bookings
      const newBookings = bookingsData.map(bookingData => ({
        id: uuidv4(),
        groupId: bookingData.groupId,
        roomId: bookingData.roomId,
        guestId: bookingData.guestId || null,
        checkIn: new Date(bookingData.checkIn),
        checkOut: new Date(bookingData.checkOut),
        occupancyType: bookingData.occupancyType,
        manualDiscount: bookingData.manualDiscount || 0,
        mealCookedBreakfast: bookingData.mealCookedBreakfast || false,
        mealContinentalBreakfast: bookingData.mealContinentalBreakfast || false,
        mealPackedLunch: bookingData.mealPackedLunch || false,
        mealCost: bookingData.mealCost || 0,
        createdAt: new Date(),
      }));

      await db.insert(roomBookings).values(newBookings);
      
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify(newBookings),
      };
    }

    // PATCH /api/room-bookings/:id - Update booking
    if (event.httpMethod === 'PATCH') {
      const bookingId = event.path.split('/').pop();
      if (!bookingId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Booking ID required' }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      
      // If dates or room are being changed, check availability
      if (body.checkIn || body.checkOut || body.roomId) {
        const existingBooking = await db.select().from(roomBookings).where(eq(roomBookings.id, bookingId));
        
        if (!existingBooking.length) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Booking not found' }),
          };
        }

        const checkIn = body.checkIn ? new Date(body.checkIn) : existingBooking[0].checkIn;
        const checkOut = body.checkOut ? new Date(body.checkOut) : existingBooking[0].checkOut;
        const roomId = body.roomId || existingBooking[0].roomId;

        const isAvailable = await checkAvailability(db, roomId, checkIn, checkOut, bookingId);
        
        if (!isAvailable) {
          return {
            statusCode: 409,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Room is not available for the selected dates' }),
          };
        }
      }

      await db.update(roomBookings)
        .set({
          roomId: body.roomId,
          guestId: body.guestId,
          secondGuestId: body.secondGuestId !== undefined ? body.secondGuestId : undefined,
          checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
          checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
          occupancyType: body.occupancyType,
          manualDiscount: body.manualDiscount,
          mealCookedBreakfast: body.mealCookedBreakfast,
          mealContinentalBreakfast: body.mealContinentalBreakfast,
          mealPackedLunch: body.mealPackedLunch,
          mealCost: body.mealCost,
          depositAmount: body.depositAmount,
          depositPaid: body.depositPaid,
          balancePaid: body.balancePaid,
          paymentNotes: body.paymentNotes,
        })
        .where(eq(roomBookings.id, bookingId));

      const updatedBooking = await db.select().from(roomBookings).where(eq(roomBookings.id, bookingId));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(updatedBooking[0]),
      };
    }

    // DELETE /api/room-bookings/:id - Delete booking
    if (event.httpMethod === 'DELETE') {
      const bookingId = event.path.split('/').pop();
      if (!bookingId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Booking ID required' }),
        };
      }

      await db.delete(roomBookings).where(eq(roomBookings.id, bookingId));
      
      return {
        statusCode: 204,
        headers: corsHeaders,
        body: '',
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error: any) {
    console.error('Error in room-bookings function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
