import { createDb } from './client.js';
import { musicTracks, printPartners, users } from './schema.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const { db, close } = createDb(url, { max: 1 });

const adminPhone = process.env.SEED_ADMIN_PHONE;
if (adminPhone) {
  await db
    .insert(users)
    .values({ phone: adminPhone, name: 'Admin', role: 'admin' })
    .onConflictDoUpdate({ target: users.phone, set: { role: 'admin' } });
  console.warn(`✔ admin user ${adminPhone}`);
}

const existingPartners = await db.select({ id: printPartners.id }).from(printPartners).limit(1);
if (existingPartners.length === 0) await db
  .insert(printPartners)
  .values([
    { name: 'Demo Press Jaipur', city: 'Jaipur', state: 'Rajasthan', phone: '+910000000001', priceList: { matte_300gsm: 1800, glossy_300gsm: 2000, textured_350gsm: 3500, handmade: 6000 } },
    { name: 'Demo Printers Chennai', city: 'Chennai', state: 'Tamil Nadu', phone: '+910000000002', priceList: { matte_300gsm: 1700, glossy_300gsm: 1900, textured_350gsm: 3200 } },
  ])
  .onConflictDoNothing();

// Upload licensed / royalty-free tracks to storage under these keys before using them.
await db
  .insert(musicTracks)
  .values([
    { id: 'shehnai-classic', title: 'Shehnai Classic', mood: 'traditional', storageKey: 'music/shehnai-classic.mp3', durationSec: 90, license: 'Add license reference' },
    { id: 'sitar-soft', title: 'Soft Sitar', mood: 'elegant', storageKey: 'music/sitar-soft.mp3', durationSec: 90, license: 'Add license reference' },
    { id: 'dhol-celebration', title: 'Dhol Celebration', mood: 'festive', storageKey: 'music/dhol-celebration.mp3', durationSec: 75, license: 'Add license reference' },
    { id: 'piano-modern', title: 'Modern Piano', mood: 'modern', storageKey: 'music/piano-modern.mp3', durationSec: 90, license: 'Add license reference' },
    { id: 'bhajan-bells', title: 'Temple Bells', mood: 'devotional', storageKey: 'music/bhajan-bells.mp3', durationSec: 80, license: 'Add license reference' },
  ])
  .onConflictDoNothing();

console.warn('✔ seed complete');
await close();
