# Backend review: code and system design (2026-11-20)

Scope: `apps/api` (NestJS + Fastify, about 12.8k lines), `apps/worker` (BullMQ + Remotion), and `packages/{db,infra,shared,ai}`.

## 1. Current architecture

```
                 Vercel (Next.js web)                  Guests / WhatsApp / Razorpay webhooks
                         │  HTTPS (cookie / Bearer)                  │
                         ▼                                           ▼
   ┌───────────────────────── DO droplet ─────────────────────────────────────┐
   │  nginx ──► API :4100  (NestJS modular monolith, 22 modules)              │
   │            Guards: Auth → Roles → Maintenance → RateLimit                │
   │            In-process caches: flags 10s, offers, templates               │
   │              │ enqueue (render, ai-clip, email, notifications, ops)      │
   │              ▼                                                           │
   │  Worker (BullMQ) ── Remotion / headless Chrome ── PDF builder            │
   └──────────────┬───────────────┬────────────────────┬──────────────────────┘
                  ▼               ▼                    ▼
       Neon Postgres (+read     Upstash Redis       DO Spaces (S3) + CDN
       replica for reports)     (queues, OTP,       renders, media, album
                                rate limits, caches)
   External: OpenRouter (AI), Razorpay, Resend, WhatsApp Cloud API, Google OAuth
```

**What is already good.** Keep doing these:
- **A modular monolith with one worker.** This is the right size for the team and the load. Module boundaries are clean and there are no circular imports.
- **Shared Zod schemas** in `@cardai/shared` serve as the API contract for both the web app and the API (`ZBody`, `ZQuery`).
- **Payment fulfilment is idempotent.** A conditional `UPDATE … status <> 'paid'` lets the browser callback and the webhook race each other safely. The refund claim works the same way.
- **Renders are deduplicated by content hash.** Paid jobs get queue priority, and the `renders` table (not Redis) is the source of truth.
- **The config fails fast.** All env vars go through one Zod schema, and production-only requirements are checked at boot.
- **One error envelope** for all errors, with a request id. Internal details are never leaked to clients.
- **Security basics are in place:** scrypt hashing, constant-time compares, single-use OTPs, admin MFA, read-only impersonation, and log redaction.

## 2. Fixed in this pass

| # | Problem | Fix |
|---|---|---|
| 1 | **Bug:** short-link code collisions were never retried. Drizzle 0.45 wraps pg errors in `DrizzleQueryError`, so `err.code === '23505'` was always false and a collision returned a 500. | `common/db.ts`: `pgErrorCode` / `isUniqueViolation` / `onUniqueViolation` read `.cause.code`. Used in short-links and admin coupons. Covered by `db.unit.test.ts`. |
| 2 | **Bug risk:** 8 counters used `INCR` followed by a separate `EXPIRE`. If the process crashed between the two, the key never expired, which means a permanent login, OTP or AI lockout. | `common/redis.ts` `bumpCounter()` does `SET NX EX` + `INCRBY` in one MULTI, so it works on any Redis or Upstash version. Applied to the rate-limit guard, OTP send and attempt counters, login fails, admin MFA, the AI quota and webhook failures. |
| 3 | Unique-constraint races (for example two saves of the same slug) surfaced as 500 errors. | The exception filter now maps SQLSTATE 23505 to **409 Conflict**. |
| 4 | Payment fulfilment recorded analytics and counted coupon use **inside** the transaction, and the coupon update used a different connection. A rolled-back payment still counted. | `markUsed(code, tx)` now runs in the transaction. Analytics, the log line and cache invalidation run after commit, and only when the order was actually paid. |
| 5 | `renders.create` made an extra DB round trip to check `print_pdf` when the entitlements were already loaded. | Checks the in-memory `features` set instead. |
| 6 | Duplicated code: the S3 config mapping (API and worker), the `Tx` type, the product-name lookup (3 places), the event-title lookup (2 places), 6 copies of the "empty env var means unset" rule, and two near-identical 20-line `renderMedia` blocks in the worker. | `storageFromEnv()` in `@cardai/infra`, `Tx`/`DbExecutor` in `common/db.ts`, `productName()` in `@cardai/shared`, `optionalStr` in `env.ts`, `renderMp4()` in the render processor. |
| 7 | `render.processor.ts` contained a non-UTF-8 byte (a cp1252 em dash). | Re-encoded the file. |

Verification: API and worker typecheck and eslint are clean, and the API tests pass (32/32, 3 of them new).

## 3. Recommendations, by priority

### P1: correctness and money
1. ~~**Refund stuck in `pending`.**~~ **Done.**
   - **Claim:** the refund claim is now `pending:<ms>`, and it is also pinned to the refunded amount that was validated.
   - **Record:** after Razorpay accepts a refund, it is saved with one atomic SQL increment (retried 3 times). Revoking access runs separately, so a failure there no longer undoes the record.
   - **Reconcile:** if saving still fails, `PaymentsService.reconcileRefunds()` settles the claim from Razorpay's refund list (`GET /payments/:id/refunds`). It runs on the 10-minute ops check, only for claims older than 15 minutes. It never revokes access, and it raises a `refund-reconciled` or `refund-reconcile-failed` alert.
2. ~~**Orphan orders.**~~ **Done.** If the gateway call (or saving its order id) fails, the order is marked `failed` and the user gets a clean 503. Saving `providerOrderId` is retried, because without it a payment could never be matched back to its order.
3. **Integration tests for the money paths.** The reconciler's decisions are unit tested with fakes (`payments.unit.test.ts`), but these still need a real database: The API has only 3 test files. The highest-value additions are tests against a throwaway Postgres (Neon branch or a docker `postgres:17`) for: concurrent `fulfil` calls granting exactly once, coupon `markUsed` rolling back with its transaction, full refund revoking access, and `consumeCredit` never going below 0.

### P2: performance
4. **N+1 writes in `events.update`.** Each function is an `UPDATE` or `INSERT` inside a loop. Replace them with a single `INSERT … ON CONFLICT (id) DO UPDATE` over all rows.
5. **`uniqueSlug` checks first, then inserts.** It is now safe because of the 409 mapping, but it still costs one extra query per try. Insert directly and retry with `onUniqueViolation` instead.
6. **Public invite page (`sites.getSite`).** This is the hottest public read and it runs several queries per view. Cache the built `PublicSiteDto` in Redis per `slug + guest` for 30–60 s, and invalidate it on publish, site save and RSVP.

### P3: scaling (do this before running more than one API instance)
7. **In-process caches** (flags, offers, templates) are invalidated only on the instance that handled the admin write. With two or more instances, the other instances keep serving stale data until their TTL runs out. Fix: publish `cache:invalidate:<name>` over Redis pub/sub and subscribe in each service's `onModuleInit`.
8. **API and worker share one droplet.** Remotion and Chrome can max out every core and slow API latency. Give the worker container `cpus:` and `mem_limit` in `docker-compose.prod.yml` now, and move it to its own droplet when render volume grows. The queue design already allows that without code changes.
9. **The rate limiter is a fixed window**, so a client can make up to twice the limit at a window boundary. That is fine for now. Switch to a sliding-window Lua script only if abuse appears.

### P4: maintainability
10. `admin.service.ts` (654 lines), `admin-analytics.service.ts` (560 lines) and `admin.controller.ts` (547 lines) are the largest files. Continue the existing split (`admin-manage`, `admin-system`, `admin-insights`) by subdomain: users, catalog, coupons.
11. `infra.module.ts` calls `loadEnv()` and opens pools as an import side effect. Moving them into `useFactory` providers would make the module testable with a fake env and would avoid parsing env twice (main.ts parses it too).
12. Prefer one `select … where id = ? and user_id = ?` for ownership checks over loading the row and comparing in JS. Ownership checks currently live in `events.getOwned`, `renders.get` and `payments.verify`; a shared `assertOwner` helper would keep the 404-not-403 rule in one place.

## 4. Scale assumptions and when to revisit

- **Assumed load:** about 10k invitations a month and peak guest traffic of a few hundred RPS on wedding days. That is mostly cacheable reads of the public site plus a burst of RSVPs. The current design handles this on one API instance with Neon autoscaling.
- **Revisit when:**
  - Render queue wait goes above about 2 minutes. Then add worker nodes.
  - p95 latency of the public site goes above about 300 ms. Then add item 6 and a CDN cache on `/i/[slug]`.
  - A second API instance is added. Item 7 becomes required.
  - Analytics raw events reach tens of millions of rows a month. Move them to ClickHouse or Tinybird and keep only the daily rollups in Postgres.
