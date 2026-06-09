import { defineConfig } from 'drizzle-kit';

const isProduction = process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
    ...(isProduction && process.env.DATABASE_AUTH_TOKEN
      ? { authToken: process.env.DATABASE_AUTH_TOKEN }
      : {}),
  },
});
