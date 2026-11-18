import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { createDb } from './client.js';

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const handle = createDb(url, { max: 1 });
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

await migrate(handle.db, { migrationsFolder });
console.warn('✔ migrations applied');
await handle.close();
