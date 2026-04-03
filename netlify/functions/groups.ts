import type { Handler } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './utils/db';
import { corsHeaders, handleCors } from './utils/cors';
import { calculateBookingTotal, calculateGroupTotal } from './utils/pricing';
import { groups, roomBookings, rooms, guests } from '../../src/db/schema';

export const handler: Handler = async (event) => {
  const corsResponse = handleCors(event.httpMethod);
  if (corsResponse) return corsResponse;

  const db = getDb();

  try {
    // GET /api/groups - List all groups with rollup calculations
    if (event.httpMethod === 'GET' && !event.path.includes('/groups/')) {
      const allGroups = await db.select().from(groups);
      
      // Calculate rollups for each group
      const groupsWithRollups = await Promise.all(
        allGroups.map(async (group) => {
          const bookings = await db.select().from(roomBookings).where(eq(roomBookings.groupId, group.id));
          
          const bookingTotals = await Promise.all(
            bookings.map(async (booking) => {
              const room = await db.select().from(rooms).where(eq(rooms.id, booking.roomId));
              return calculateBookingTotal(booking, room[0]);
            })
          );

          return {
            ...group,
            totalRoomsBooked: bookings.length,
            grandTotal: calculateGroupTotal(bookingTotals, group.groupDiscountAmount || 0),
          };
        })
      );
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(groupsWithRollups),
      };
    }

    // GET /api/groups/:id - Get group with all room bookings
    if (event.httpMethod === 'GET') {
      const groupId = event.path.split('/').pop();
      if (!groupId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Group ID required' }),
        };
      }

      const group = await db.select().from(groups).where(eq(groups.id, groupId));
      
      if (!group.length) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Group not found' }),
        };
      }

      const bookings = await db.select().from(roomBookings).where(eq(roomBookings.groupId, groupId));
      
      const bookingsWithDetails = await Promise.all(
        bookings.map(async (booking) => {
          const room = await db.select().from(rooms).where(eq(rooms.id, booking.roomId));
          const guest = booking.guestId 
            ? await db.select().from(guests).where(eq(guests.id, booking.guestId))
            : [];
          const secondGuest = booking.secondGuestId
            ? await db.select().from(guests).where(eq(guests.id, booking.secondGuestId))
            : [];
          return {
            ...booking,
            room: room[0],
            guest: guest[0] || null,
            secondGuest: secondGuest[0] || null,
            total: calculateBookingTotal(booking, room[0]),
          };
        })
      );

      const bookingTotals = bookingsWithDetails.map(b => b.total);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          ...group[0],
          roomBookings: bookingsWithDetails,
          totalRoomsBooked: bookings.length,
          grandTotal: calculateGroupTotal(bookingTotals, group[0].groupDiscountAmount || 0),
        }),
      };
    }

    // POST /api/groups - Create group
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      const newGroup = {
        id: uuidv4(),
        groupName: body.groupName,
        primaryContactId: body.primaryContactId || null,
        groupDiscountAmount: body.groupDiscountAmount || 0,
        notes: body.notes || null,
        createdAt: new Date(),
      };

      await db.insert(groups).values(newGroup);
      
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify(newGroup),
      };
    }

    // PATCH /api/groups/:id - Update group
    if (event.httpMethod === 'PATCH') {
      const groupId = event.path.split('/').pop();
      if (!groupId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Group ID required' }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      
      await db.update(groups)
        .set({
          groupName: body.groupName,
          primaryContactId: body.primaryContactId,
          groupDiscountAmount: body.groupDiscountAmount,
          notes: body.notes,
        })
        .where(eq(groups.id, groupId));

      const updatedGroup = await db.select().from(groups).where(eq(groups.id, groupId));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(updatedGroup[0]),
      };
    }

    // DELETE /api/groups/:id - Delete group (cascade room bookings)
    if (event.httpMethod === 'DELETE') {
      const groupId = event.path.split('/').pop();
      if (!groupId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Group ID required' }),
        };
      }

      await db.delete(groups).where(eq(groups.id, groupId));
      
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
    console.error('Error in groups function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
