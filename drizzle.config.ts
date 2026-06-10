import { defineConfig } from 'drizzle-kit';

const isProduction = process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  // drizzle-kit only passes authToken through when the dialect is 'turso'
  dialect: isProduction ? 'turso' : 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
    ...(isProduction && process.env.DATABASE_AUTH_TOKEN
      ? { authToken: process.env.DATABASE_AUTH_TOKEN }
      : {}),
  },
});
