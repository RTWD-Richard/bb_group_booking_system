import type { Handler } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import { getDb } from './utils/db';
import { corsHeaders, handleCors } from './utils/cors';
import { rooms } from '../../src/db/schema';

export const handler: Handler = async (event) => {
  const corsResponse = handleCors(event.httpMethod);
  if (corsResponse) return corsResponse;

  const db = getDb();

  try {
    // GET /api/rooms - List all rooms
    if (event.httpMethod === 'GET' && !event.path.includes('/rooms/')) {
      const allRooms = await db.select().from(rooms);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(allRooms),
      };
    }

    // PATCH /api/rooms/:id - Update room
    if (event.httpMethod === 'PATCH') {
      const roomId = event.path.split('/').pop();
      if (!roomId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Room ID required' }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      
      // Build update object with only provided fields
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.singleRate !== undefined) updateData.singleRate = body.singleRate;
      if (body.doubleRate !== undefined) updateData.doubleRate = body.doubleRate;
      if (body.housekeepingStatus !== undefined) updateData.housekeepingStatus = body.housekeepingStatus;
      
      if (Object.keys(updateData).length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'No valid fields to update' }),
        };
      }
      
      await db.update(rooms)
        .set(updateData)
        .where(eq(rooms.id, roomId));

      const updatedRoom = await db.select().from(rooms).where(eq(rooms.id, roomId));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(updatedRoom[0]),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error: any) {
    console.error('Error in rooms function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
