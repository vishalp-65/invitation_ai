import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://cardai:cardai@localhost:5432/cardai',
  },
  casing: 'snake_case',
  strict: true,
});
