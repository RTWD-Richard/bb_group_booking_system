import type { Handler } from '@netlify/functions';
import { eq, or, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './utils/db';
import { corsHeaders, handleCors } from './utils/cors';
import { guests } from '../../src/db/schema';

export const handler: Handler = async (event) => {
  const corsResponse = handleCors(event.httpMethod);
  if (corsResponse) return corsResponse;

  const db = getDb();

  try {
    // GET /api/guests - List guests (with optional search)
    if (event.httpMethod === 'GET' && !event.path.includes('/guests/')) {
      const search = event.queryStringParameters?.search;
      
      let allGuests;
      if (search) {
        allGuests = await db.select().from(guests).where(
          or(
            like(guests.name, `%${search}%`),
            like(guests.email, `%${search}%`)
          )
        );
      } else {
        allGuests = await db.select().from(guests);
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(allGuests),
      };
    }

    // GET /api/guests/:id - Get single guest
    if (event.httpMethod === 'GET') {
      const guestId = event.path.split('/').pop();
      if (!guestId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Guest ID required' }),
        };
      }

      const guest = await db.select().from(guests).where(eq(guests.id, guestId));
      
      if (!guest.length) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Guest not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(guest[0]),
      };
    }

    // POST /api/guests - Create guest
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      const newGuest = {
        id: uuidv4(),
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        dietaryRequirements: body.dietaryRequirements || null,
        createdAt: new Date(),
      };

      await db.insert(guests).values(newGuest);
      
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify(newGuest),
      };
    }

    // PATCH /api/guests/:id - Update guest
    if (event.httpMethod === 'PATCH') {
      const guestId = event.path.split('/').pop();
      if (!guestId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Guest ID required' }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      
      await db.update(guests)
        .set({
          name: body.name,
          email: body.email,
          phone: body.phone,
          dietaryRequirements: body.dietaryRequirements,
        })
        .where(eq(guests.id, guestId));

      const updatedGuest = await db.select().from(guests).where(eq(guests.id, guestId));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(updatedGuest[0]),
      };
    }

    // DELETE /api/guests/:id - Delete guest
    if (event.httpMethod === 'DELETE') {
      const guestId = event.path.split('/').pop();
      if (!guestId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Guest ID required' }),
        };
      }

      await db.delete(guests).where(eq(guests.id, guestId));
      
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
    console.error('Error in guests function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
