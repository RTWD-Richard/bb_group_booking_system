import type { Handler } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import { getDb } from './utils/db';
import { corsHeaders, handleCors } from './utils/cors';
import { settings } from '../../src/db/schema';

const DEFAULT_SETTINGS_ID = 'default';

export const handler: Handler = async (event) => {
  const corsResponse = handleCors(event.httpMethod);
  if (corsResponse) return corsResponse;

  const db = getDb();

  try {
    // GET /api/settings - Get settings (creates defaults if not exists)
    if (event.httpMethod === 'GET') {
      let settingsData = await db.select().from(settings).where(eq(settings.id, DEFAULT_SETTINGS_ID));
      
      // If no settings exist, create defaults
      if (settingsData.length === 0) {
        const defaultSettings = {
          id: DEFAULT_SETTINGS_ID,
          bnbName: 'My B&B',
          bnbEmail: '',
          bnbPhone: '',
          bnbAddress: '',
          checkInTime: '14:00',
          checkOutTime: '11:00',
          currency: 'GBP',
          taxRate: 0,
          defaultMealCookedPrice: 12,
          defaultMealContinentalPrice: 8,
          defaultMealPackedPrice: 10,
          cancellationPolicy: '',
          updatedAt: new Date(),
        };
        
        await db.insert(settings).values(defaultSettings);
        settingsData = [defaultSettings];
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(settingsData[0]),
      };
    }

    // PATCH /api/settings - Update settings
    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      // Only update fields that are provided
      if (body.bnbName !== undefined) updateData.bnbName = body.bnbName;
      if (body.bnbEmail !== undefined) updateData.bnbEmail = body.bnbEmail;
      if (body.bnbPhone !== undefined) updateData.bnbPhone = body.bnbPhone;
      if (body.bnbAddress !== undefined) updateData.bnbAddress = body.bnbAddress;
      if (body.checkInTime !== undefined) updateData.checkInTime = body.checkInTime;
      if (body.checkOutTime !== undefined) updateData.checkOutTime = body.checkOutTime;
      if (body.currency !== undefined) updateData.currency = body.currency;
      if (body.taxRate !== undefined) updateData.taxRate = body.taxRate;
      if (body.defaultMealCookedPrice !== undefined) updateData.defaultMealCookedPrice = body.defaultMealCookedPrice;
      if (body.defaultMealContinentalPrice !== undefined) updateData.defaultMealContinentalPrice = body.defaultMealContinentalPrice;
      if (body.defaultMealPackedPrice !== undefined) updateData.defaultMealPackedPrice = body.defaultMealPackedPrice;
      if (body.cancellationPolicy !== undefined) updateData.cancellationPolicy = body.cancellationPolicy;
      
      await db.update(settings)
        .set(updateData)
        .where(eq(settings.id, DEFAULT_SETTINGS_ID));
      
      const updated = await db.select().from(settings).where(eq(settings.id, DEFAULT_SETTINGS_ID));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(updated[0]),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
    
  } catch (error: any) {
    console.error('Settings error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
