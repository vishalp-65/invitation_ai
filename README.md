# Noyta — invitation cards, video invites and invitation websites

One form → three outputs: a multi-page **image card**, an animated **video invite** (WhatsApp-sized) and an
**invitation website** with per-function RSVP and personalised guest links. Built for Indian families
(12 languages, every occasion from shaadi to bhandara), rural and urban, web and WhatsApp.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web | Next.js 16 (App Router), React 19, Tailwind 4, TanStack Query, Zustand, next-intl (en/hi) | SSR for SEO + WhatsApp link previews, fast mobile UI |
| API | NestJS 12 on Fastify, Zod validation (schemas shared with web), Drizzle ORM | Structured modules, DI, guards; one schema language end-to-end |
| Jobs | BullMQ on Redis | Priority queues (paid jobs first), retries, idempotent workers |
| Rendering | **Remotion** (headless Chrome) | One React layout drives live preview, PNG/JPG, PDF and MP4 — and Chrome shapes Devanagari/Tamil/etc. correctly |
| AI | OpenRouter: text (wording, transliteration, translation, intent parsing), image (backgrounds, caricatures), async video (cinematic intro) | One key, model fallbacks, per-call cost tracking |
| Storage | S3-compatible (RustFS locally, Cloudflare R2 / S3 in prod) | Presigned browser uploads, CDN-served outputs |
| Data | PostgreSQL 17 | |
| Payments | Razorpay (UPI, cards, wallets) with idempotent fulfilment + webhook | |
| Messaging | WhatsApp Cloud API bot + email OTP (Resend) | |

## Repository layout

```
apps/
  api/       NestJS API (modules: auth, events, templates, media, ai, renders, payments,
             sites (public), guests+rsvp, whatsapp bot, print, marketplace, health)
  worker/    BullMQ workers: Remotion card/video renders, PDF + print PDF, AI clips
  web/       Next.js app: landing, create wizard, dashboard, public invite site, designer, admin
packages/
  shared/    Zod schemas, domain constants (events, languages, products), invite props builder
  templates/ Remotion layouts (cards + video) — used by web preview AND worker
  db/        Drizzle schema, migrations, seed
  ai/        OpenRouter client + versioned prompts (server-only)
  infra/     S3 storage + Redis adapters (server-only)
infra/       Dockerfiles, storage bootstrap
```

## Run locally

Requirements: Node 24, Docker Desktop.

```bash
cp .env.example .env              # add OPENROUTER_API_KEY to enable AI features
npm install
npm run infra:up                  # Postgres, Redis, S3-compatible storage
docker compose run --rm minio-init
npm run build                     # builds shared packages
npm run db:migrate && npm run db:seed
npm run dev                       # api :4000, worker, web :3000
```

- Sign-in OTP codes are printed in the API log while `EMAIL_PROVIDER=console`.
- Without Razorpay keys a mock gateway is used in development (payments succeed instantly).
- Without WhatsApp keys, bot messages are logged instead of sent.

## Key design decisions

- **Same layout everywhere.** `@cardai/templates` is rendered in the browser by `@remotion/player` for the live
  preview and by the worker for final files, so previews are exact and editing costs nothing server-side.
- **AI where it adds value, templates where they're cheaper.** Videos are template animations (≈ cents to render);
  generative video is an optional 6 s cinematic intro (≈ $0.18 at 720p) sold as an add-on with automatic refund on failure.
- **Render de-duplication.** A hash of everything that changes pixels means re-clicking "Make" returns the existing file.
- **Free tier is genuinely usable** (watermarked 720p card, website link, 25 guests) with daily AI quotas to cap cost.
- **Phone number is the identity** for both the website and the WhatsApp bot, so a user can start in WhatsApp and
  continue on the web.
- **Settings PATCH semantics**: `null` clears a field; omitted leaves it unchanged (Zod 4 would otherwise inject defaults).

## Templates

- **43 design families × colourways = 140 templates**, defined as data in `packages/shared/src/templates/catalog.ts`.
- Each family = a layout (`royal-arch`, `jharokha`, `art-deco`, …) + motif/pattern + an optional **decor** layer:
  - `art`: `ganesha` (gold calligraphic), `couple`, `diya`
  - `coupleStyle`: `watercolor` | `caricature` | `lineart`; `attire`: `north` | `south` | `bengali` | `marathi` | `sikh` | `muslim` | `christian`
  - `florals`: `marigold` | `rose` | `lotus` | `jasmine` | `mixed` (corner bouquets), `toran` (marigold garland + brass lanterns), `mandala`, `nameFont`
- All artwork is hand-built SVG in `packages/templates/src/art/` — crisp at print resolution, no image assets.
- The cover is a complete invitation: blessing, hosts, names with parentage, the ceremony's
  **day | date | time** strip and venue. Content auto-scales (`FitBox`) so long names never overflow.
- After changing templates, regenerate gallery thumbnails: `npm run showcase -w @cardai/worker`
  (optionally pass comma-separated template ids).

## Licensing note

Remotion is free for individuals and companies of up to 3 people; larger companies need a
[Remotion company license](https://www.remotion.dev/license) before going to production.
Music tracks seeded in `packages/db/src/seed.ts` are placeholders — upload properly licensed audio.
