import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { rooms } from '@/db/schema';

export async function GET() {
  try {
    const allRooms = await db.select().from(rooms);
    return NextResponse.json(allRooms);
  } catch (error: any) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const roomId = pathParts[pathParts.length - 1];
    
    const body = await request.json();
    
    await db.update(rooms)
      .set({ housekeepingStatus: body.housekeepingStatus })
      .where(eq(rooms.id, roomId));

    const updatedRoom = await db.select().from(rooms).where(eq(rooms.id, roomId));
    
    return NextResponse.json(updatedRoom[0]);
  } catch (error: any) {
    console.error('Error updating room:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
