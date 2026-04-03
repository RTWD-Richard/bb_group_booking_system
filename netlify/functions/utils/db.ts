import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { createClient } from '@libsql/client';
import * as schema from '../../../src/db/schema';

// Database client for Netlify Functions
// Uses local file in dev, HTTP client in production
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
  
  const client = createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  return drizzle(async (sql, params, method) => {
    try {
      const rows = await client.execute({ sql, args: params });
      return { rows: rows.rows as any[] };
    } catch (e: any) {
      console.error('Database error:', e);
      throw e;
    }
  }, { schema });
}
