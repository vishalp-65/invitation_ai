#!/usr/bin/env node
/**
 * Tell IndexNow search engines (Bing, which powers ChatGPT search, Microsoft Copilot and DuckDuckGo;
 * plus Yandex, Seznam and Naver) that the public pages changed, instead of waiting for a recrawl.
 *
 * Run after a deploy:   npm run indexnow -w @cardai/web
 * Only some pages:      npm run indexnow -w @cardai/web -- /blog /faq
 *
 * The key is public by design: public/<key>.txt must be live on the site for engines to accept it.
 */
const SITE = (process.env.INDEXNOW_SITE ?? 'https://noyta.in').replace(/\/$/, '');
const KEY = 'ec2e4f855b70aaa828bafa24ff468a4f';

async function urlsFromSitemap() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
  return [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const args = process.argv.slice(2);
const urlList = args.length ? args.map((p) => (p.startsWith('http') ? p : `${SITE}${p.startsWith('/') ? '' : '/'}${p}`)) : await urlsFromSitemap();

const keyCheck = await fetch(`${SITE}/${KEY}.txt`);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
  console.error(`Key file ${SITE}/${KEY}.txt is not live yet. Deploy first, then run this again.`);
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
});
// 200 = accepted, 202 = accepted, key validation pending.
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} URLs`);
if (res.status >= 300) {
  console.error(await res.text());
  process.exit(1);
}
