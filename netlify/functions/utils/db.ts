import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from '../../../src/db/schema';

// Database client for Netlify Functions.
// file: URLs (local dev) need the native client; Turso URLs use the HTTP-only
// web client, because the functions bundle is built on the dev machine and a
// platform-native binary would not match the Lambda runtime.
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

  const { createClient } = databaseUrl.startsWith('file:')
    ? require('@libsql/client')
    : require('@libsql/client/web');

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
