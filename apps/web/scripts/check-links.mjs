// Fails when an internal link in src/ points at a route, blog post or public asset that doesn't exist.
// Run: pnpm --filter web check:links (or `node scripts/check-links.mjs` from apps/web).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const src = join(root, 'src');
const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? (n === 'node_modules' ? [] : walk(p)) : [p];
  });
const files = walk(src);

// Routes from the app directory: page.tsx and route.ts(x), [param] segments match anything.
const routes = files
  .map((f) => relative(join(src, 'app'), f).replace(/\\/g, '/'))
  .filter((f) => !f.startsWith('..') && /(^|\/)(page\.tsx|route\.tsx?)$/.test(f))
  .map((f) => '/' + f.replace(/(^|\/)(page\.tsx|route\.tsx?)$/, '').replace(/\/$/, ''))
  // Route groups like (app) and parallel/private folders don't appear in the URL.
  .map((r) => r.split('/').filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith('@')).join('/'))
  .map((r) => (r === '' || r === '/' ? '/' : r.replace(/\/$/, '')));
const toRe = (r) => new RegExp('^' + r.replace(/\[[^\]]+\]/g, '[^/]+').replace(/\./g, '\\.') + '$');
// /[occasion] only serves the known occasion slugs, so it must not swallow every one-segment path.
const routeRes = routes.filter((r) => r !== '/[occasion]').map(toRe);

const read = (p) => readFileSync(p, 'utf8');
const occasionSlugs = [...read(join(src, 'features/occasions/routes.ts')).matchAll(/:\s*'([a-z-]+-invitation)'/g)].map((m) => m[1]);
const blogSlugs = readdirSync(join(src, 'features/blog/posts')).map((f) => f.replace(/\.ts$/, ''));

// Paths that are handled outside the Next pages: API proxy, short links, metadata files.
const IGNORE = [/^\/api\//, /^\/sitemap\.xml$/, /^\/robots\.txt$/, /^\/manifest/, /^\/account\//, /^\/offers\//];

const bad = [];
const check = (file, line, path) => {
  const p = path.replace(/[?#].*$/, '').replace(/(.)\/$/, '$1');
  if (!p || p === '/' || IGNORE.some((r) => r.test(p))) return;
  const publicFile = join(root, 'public', p);
  if (existsSync(publicFile) && statSync(publicFile).isFile()) return;
  const m = p.match(/^\/blog\/([^/]+)$/);
  if (m && !['rss.xml'].includes(m[1]) && !blogSlugs.includes(m[1])) return bad.push([file, line, path, 'unknown blog post']);
  if (m) return;
  if (occasionSlugs.includes(p.slice(1))) return;
  if (!routeRes.some((r) => r.test(p))) bad.push([file, line, path, 'no matching route']);
};

for (const f of files.filter((f) => /\.(tsx?|md)$/.test(f))) {
  read(f)
    .split('\n')
    .forEach((text, i) => {
      // Skip dynamic targets (template strings with ${...} after the static prefix are checked by prefix only).
      for (const m of text.matchAll(/(?:href|to|redirect|push|replace)(?:=\{?|\()\s*(['"`])(\/[A-Za-z0-9_\-/.]*)(?=[?#'"`$])/g)) {
        const after = text[m.index + m[0].length];
        if (after === '$') continue; // dynamic tail, e.g. `/dashboard/events/${id}`
        check(relative(root, f), i + 1, m[2]);
      }
    });
}

if (bad.length) {
  console.error(`Broken internal links (${bad.length}):`);
  for (const [f, l, p, why] of bad) console.error(`  ${f}:${l}  ${p}  (${why})`);
  process.exit(1);
}
console.log(`Link check passed: ${routes.length} routes, ${occasionSlugs.length} occasion pages, ${blogSlugs.length} posts.`);
