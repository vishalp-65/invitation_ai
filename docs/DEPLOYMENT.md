# Deploying Noyta

```
Browser ──► noyta.in (Vercel, Next.js) ──/api/* rewrite──► api.noyta.in (nginx on droplet) ──► 127.0.0.1:4100  noyta-api container
                                                                                               noyta-worker container (Remotion renders)
api + worker ──► Neon Postgres · Upstash Redis · DigitalOcean Spaces (media) · Resend · OpenRouter · Razorpay · WhatsApp Cloud API
```

- The backend runs on the shared droplet (`ubuntu-s-1vcpu-2gb-blr1`: 1 vCPU, 2 GB RAM, 50 GB disk) as its own compose project (`noyta`) in `/opt/noyta`. It never touches `/opt/interviewpilot`.
- Only the API is published, on loopback port **4100**. nginx on the host maps `api.noyta.in` to it.
- The browser calls `noyta.in/api/*` and Vercel proxies those calls to `api.noyta.in`, so cookies stay first-party.
- Images are built on GitHub's runners, never on the droplet. The droplet only pulls and runs them.
- Vercel deploys the frontend on its own, from every push.

| File | Purpose |
| --- | --- |
| `infra/docker/api.Dockerfile`, `infra/docker/worker.Dockerfile` | Images. The worker image holds the prebuilt Remotion bundle and Chrome Headless Shell; webpack and TypeScript stay in the build stage. |
| `infra/deploy/docker-compose.prod.yml` | What runs on the droplet, with memory/CPU limits sized for 2 GB. CI copies it on every deploy. |
| `infra/deploy/deploy.sh` | Pull → migrate → swap → health gate → rollback → old-image cleanup. CI runs it; you run it to roll back. |
| `infra/deploy/bootstrap.sh` | One-time droplet setup (deploy user, `/opt/noyta`, SSH key, swap, nginx, HTTPS). Safe to re-run. |
| `infra/deploy/nginx-api.noyta.in.conf` | nginx site for `api.noyta.in` |
| `infra/storage/cors.prod.json` | CORS for the Spaces bucket |
| `.github/workflows/backend.yml` | CI/CD |
| `.env.production` (local, git-ignored) | Production env with generated JWT and verify-token secrets. Fill it, copy it to the droplet, keep it out of the repo. |

### Memory budget (2 GB droplet)

| | Limit | Typical |
| --- | --- | --- |
| OS, nginx, Docker | – | ~300 MB |
| interviewpilot | its own | check with `docker stats` |
| `noyta-api` | 512 MB (`API_MEMORY`) | ~150–250 MB |
| `noyta-worker` idle | 1200 MB (`WORKER_MEMORY`) | ~150 MB (Chrome closes after 5 idle minutes) |
| `noyta-worker` rendering | same, plus swap | ~0.8–1.2 GB |
| Swap | 2 GB (`bootstrap.sh`) | used only during render spikes |

The worker renders one job at a time with one Chrome tab and has half the CPU weight of other containers, so the API and interviewpilot stay responsive while a video renders. On 1 vCPU a 9:16 video takes a few minutes; image cards take seconds. If renders queue up or the API slows down, move to a 2 vCPU / 4 GB droplet and raise `WORKER_MEMORY=2g`, `REMOTION_CONCURRENCY=2` in `/opt/noyta/.env`.

---

## Step 0: Look at the droplet first (5 min)

```bash
ssh root@<droplet-ip>
free -h && df -h /
docker stats --no-stream                       # how much interviewpilot uses
ss -tlnp | grep -E ':(80|443|4100)\b'
```

- **Ports 80/443** should belong to `nginx` on the host. If a container (interviewpilot's nginx/Caddy/Traefik) owns them, add `api.noyta.in → host:4100` in that proxy instead; `bootstrap.sh` detects this and skips its nginx/certbot part.
- **Port 4100** must be free. If not, set `API_HOST_PORT` in `/opt/noyta/.env` and change the port in the nginx site.
- **RAM.** If interviewpilot already uses more than ~700 MB, lower `WORKER_MEMORY` to `1g`, or resize the droplet.

---

## Step 1: DNS (at your noyta.in registrar / DNS host)

| Type | Name | Value |
| --- | --- | --- |
| A | `api` | droplet IPv4 |
| A | `@` | `76.76.21.21` (Vercel), or the value Vercel shows in step 5 |
| CNAME | `www` | `cname.vercel-dns.com` |

Resend's DNS records (SPF/DKIM/DMARC for `noyta.in`) should already exist. If not: Resend → Domains → `noyta.in`.

Add the `api` record before step 3, so `bootstrap.sh` can get the HTTPS certificate in the same run.

---

## Step 2: Storage (DigitalOcean Spaces)

Spaces holds user uploads (photos, logos, card scans), the guest photo album, rendered cards, PDFs, videos and AI images. The API never stores files on its own disk: the browser uploads straight to the bucket with a presigned URL and the bucket's CDN serves the files. The storage code (`packages/infra/src/storage.ts`) is S3-compatible; with `S3_PUBLIC_READ_ACL=true` every object is written `public-read`, since Spaces has no public-bucket policy.

1. DigitalOcean → **Spaces Object Storage → Create Bucket**: region **BLR1** (same as the droplet), **CDN on**, name `noyta-media`, file listing **Restricted**.
2. **Spaces Object Storage → Access Keys → Create Access Key**: Limited access, scoped to `noyta-media`, Read/Write/Delete. Put the key and secret in `.env.production` (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`). The secret is shown only once.
3. **CORS** so the browser can PUT uploads: Bucket → Settings → CORS Configurations → origin `https://noyta.in` (and `https://www.noyta.in`), methods GET/PUT/HEAD, allowed header `*`, max age 3600. (Same rules as `infra/storage/cors.prod.json`.)
4. In `.env.production`:

   ```
   S3_ENDPOINT=https://blr1.digitaloceanspaces.com      # no bucket name in it
   S3_REGION=blr1
   S3_BUCKET=noyta-media
   S3_FORCE_PATH_STYLE=false
   S3_PUBLIC_READ_ACL=true
   STORAGE_PUBLIC_URL=https://noyta-media.blr1.cdn.digitaloceanspaces.com
   ```

   Optional: a `cdn.noyta.in` custom subdomain (Bucket → Settings → CDN). Then update `STORAGE_PUBLIC_URL` here and in Vercel.

Cost: $5/month includes 250 GB storage and 1 TB of CDN transfer.

---

## Step 3: Droplet setup (once, ~5 min)

From the repo root on your PC:

```bash
scp -r infra/deploy root@<droplet-ip>:/root/noyta-deploy
ssh root@<droplet-ip> bash /root/noyta-deploy/bootstrap.sh
```

`bootstrap.sh` checks Docker (installs it only if missing), creates the `deploy` user and `/opt/noyta`, installs the compose file and `deploy.sh`, generates the GitHub Actions SSH key and **prints the private key once** (copy it for `DO_SSH_KEY` in step 4), adds 2 GB swap if the droplet has none, installs the nginx site and runs certbot when `api.noyta.in` already points at the droplet. Re-running it changes nothing that is already set up.

**Env file.** Fill every `<...>` in `.env.production`:

- `DATABASE_URL`: Neon's **pooled** string. `DATABASE_URL_DIRECT`: the direct one, used for migrations.
- `REDIS_URL`: Upstash's `rediss://` URL.
- `RESEND_API_KEY`, plus the Spaces, Razorpay, OpenRouter, Google and WhatsApp values.

The JWT secrets and the WhatsApp verify token are already generated. Worker/API limits come from the compose file; leave them commented unless you need to override. Then:

```bash
scp .env.production root@<droplet-ip>:/opt/noyta/.env
ssh root@<droplet-ip> "chown deploy:deploy /opt/noyta/.env && chmod 600 /opt/noyta/.env"
```

New secret later: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

---

## Step 4: GitHub (CI/CD)

1. Push the repo to GitHub (`vishalp-65/invitation_ai`).
2. **Settings → Environments → New environment `production`**. Optionally add yourself as a required reviewer to approve every deploy.
3. In the `production` environment, add these **Secrets**:

| Secret | Value |
| --- | --- |
| `DO_HOST` | droplet IP |
| `DO_USER` | `deploy` |
| `DO_SSH_KEY` | the private key `bootstrap.sh` printed |
| `GHCR_PULL_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens (classic) → scope **`read:packages`** only, so the droplet can pull private images |

4. **Settings → Actions → General → Workflow permissions**: "Read and write permissions", so the workflow can push to GHCR with `GITHUB_TOKEN`.
5. First deploy: **Actions → backend → Run workflow** (or push to `main`). Pull requests run only `verify`. On `main`:
   - `verify`: typecheck, lint and test.
   - `build`: builds `ghcr.io/vishalp-65/noyta-api:<sha>` and `noyta-worker:<sha>` with a layer cache, so a code-only change rebuilds only the last layers and the droplet pulls only those.
   - `deploy`: copies the compose file and `deploy.sh`, then runs `deploy.sh`: pull, migrate Neon with the new image (before anything is swapped), recreate the containers, wait for `/api/health/ready`, roll back to the previous images if it fails, and delete Noyta images older than the previous tag.

The API restarts in a few seconds during a deploy (there is no room for two copies on 2 GB). The worker gets up to 2 minutes to finish an in-flight render; anything cut off is retried by BullMQ.

Seed data once, if you need it (print partners, music track rows):

```bash
cd /opt/noyta
docker compose -f docker-compose.prod.yml --env-file .env --env-file .deploy.env run --rm --no-deps api node packages/db/dist/seed.js
```

---

## Step 5: Frontend on Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo.
2. Settings:
   - **Root Directory**: `apps/web`
   - Turn on "Include files outside the Root Directory" (the default for monorepos).
   - Framework: Next.js
   - **Install Command**: `cd ../.. && npm ci`
   - **Build Command**: `cd ../.. && npx turbo run build --filter=@cardai/web...`
   - Node.js: **24.x**
3. **Environment Variables** (Production):

```
API_INTERNAL_URL=https://api.noyta.in
NEXT_PUBLIC_APP_URL=https://noyta.in
STORAGE_PUBLIC_URL=https://noyta-media.blr1.cdn.digitaloceanspaces.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=<rzp_live_... same as backend RAZORPAY_KEY_ID>
NEXT_PUBLIC_SHORT_HOST=            # only once you have a short domain
CLIENT_IP_SECRET=<same value as the API's CLIENT_IP_SECRET>
```

`CLIENT_IP_SECRET` lets the API trust each visitor's real IP for rate limits. The web proxy signs it,
and the API ignores any `X-Forwarded-For` a client sends. **Roll it out in this order:**
1. Add it in Vercel and redeploy the web app.
2. Add the same value to `/opt/noyta/.env` and redeploy the API.

If the API gets it first, every visitor shares Vercel's IP addresses, and so shares one rate limit.
The API refuses to start in production without it.

Session cookies are host-only: leave `COOKIE_DOMAIN` empty. Browsers that still hold the old
`.noyta.in` cookies get them cleared on their next sign-in or refresh.

4. Deploy, then **Settings → Domains**: add `noyta.in` as primary, and `www.noyta.in` redirecting to it. The DNS records Vercel shows should match step 1.
5. Every push to `main` deploys production and every PR gets a preview URL. Preview URLs call the production API through the rewrite; point the Preview env `API_INTERNAL_URL` elsewhere if you don't want that.

---

## Step 6: Third-party dashboards

| Service | Set to |
| --- | --- |
| Google Cloud → OAuth client | Authorised redirect URI `https://noyta.in/api/auth/google/callback`, JS origin `https://noyta.in` |
| Razorpay → Webhooks | `https://api.noyta.in/api/payments/webhook/razorpay` (secret = `RAZORPAY_WEBHOOK_SECRET`; events `payment.captured`, `order.paid`, `payment.failed`) |
| Resend → Webhooks | `https://api.noyta.in/api/mail/webhooks/resend` (events `email.bounced`, `email.complained`), then put the signing secret in `RESEND_WEBHOOK_SECRET` and restart (below) |
| WhatsApp (Meta) | see the next section |

After editing `/opt/noyta/.env`, restart the containers (no build needed):

```bash
cd /opt/noyta && docker compose -f docker-compose.prod.yml --env-file .env --env-file .deploy.env up -d --force-recreate api worker
```

---

## Step 7: WhatsApp Cloud API

The WhatsApp code is already in the app (`apps/api/src/modules/whatsapp`). It covers:

- sending invite templates to guests,
- the chat bot,
- the webhook at **`https://api.noyta.in/api/webhooks/whatsapp`**.

It needs five values: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` (already generated) and `WHATSAPP_INVITE_TEMPLATE`.

1. **Business portfolio.** Go to business.facebook.com and create a Business portfolio named "Noyta".
   - Later, do Business settings → Security Centre → **Business verification** (GST/Udyam/PAN documents, website noyta.in).
   - Verification raises the sending limit from 250 to 1,000+ customers a day and is required for the display name.
2. **Meta app.** Go to developers.facebook.com → My Apps → **Create app**.
   - Use case: "Connect with customers through WhatsApp".
   - Pick the Noyta business portfolio, then create.
3. **Test number.** WhatsApp → **API Setup**.
   - Meta gives you a test number and a temporary 24 h token.
   - Add your own phone under "To" and send the `hello_world` test message to confirm it works.
4. **Real number.** API Setup → **Add phone number**.
   - The number must **not** be registered on the WhatsApp or WhatsApp Business app. Delete that account first, or use a fresh SIM or landline.
   - Display name: "Noyta" (reviewed by Meta, needs to match your brand/website). Category: Event planning/Services.
   - Verify it by SMS or voice code.
   - Copy its **Phone number ID** (not the phone number itself) into `WHATSAPP_PHONE_NUMBER_ID`.
5. **Permanent access token.** The temporary token expires, so create a system user:
   - Business settings → Users → **System users → Add**, name "noyta-api", role **Admin**.
   - **Assign assets**: the app (Full control) and the WhatsApp account (Full control).
   - **Generate new token**: pick the app, set expiry to **Never**, and select permissions `whatsapp_business_messaging` and `whatsapp_business_management`.
   - Copy the token into `WHATSAPP_ACCESS_TOKEN`.
6. **App secret.** App → App settings → **Basic → App secret → Show**. Copy it into `WHATSAPP_APP_SECRET`. Every webhook is signature-checked with it.
7. **Webhook.** Do this *after* the backend is live with the env above, because Meta calls it immediately.
   - WhatsApp → **Configuration → Webhook → Edit**:
     - Callback URL: `https://api.noyta.in/api/webhooks/whatsapp`
     - Verify token: the `WHATSAPP_VERIFY_TOKEN` value from `.env.production`
   - Click Verify and save, then under Webhook fields, **Subscribe** to `messages`.
8. **Invite template.** WhatsApp Manager (business.facebook.com/wa/manage) → **Message templates → Create**.
   - Category **Utility**, name **`invitation_link`**, language **English (`en`)**.
     - The code sends language code `en`. Pick plain "English", not "English (US)".
   - Body (exactly 3 variables, in this order):
     ```
     Hi {{1}}, you're invited to {{2}}! 🎉
     Open your invitation: {{3}}
     ```
   - Sample values: `Priya`, `Aarav & Diya's Wedding`, `https://noyta.in/s/k7Qp2`. Submit; approval takes minutes to a few hours.
   - If Meta reclassifies it as Marketing, that's fine; it just costs more per message.
9. **Billing.** WhatsApp Manager → **Payment settings → Add payment method**.
   - Business-initiated template messages are billed per message. Replies inside the 24 h customer window are free.
10. **Go live.** Switch the app to **Live** mode (App → Publish). Meta requires a **Privacy Policy URL**, e.g. `https://noyta.in/privacy`.
    - The site has no `/privacy` page yet. Add one before this step.
11. **Test.**
    - Message "hi" to the business number from your phone: the bot should reply.
    - Logs: `docker compose -f /opt/noyta/docker-compose.prod.yml --env-file /opt/noyta/.env --env-file /opt/noyta/.deploy.env logs -f api | grep -i whatsapp`.

---

## Step 8: Verify

```bash
curl -s https://api.noyta.in/api/health/ready      # {"status":"ready"} = Neon + Upstash reachable
curl -s https://noyta.in/api/health                # through the Vercel rewrite
```

```bash
# on the droplet
cd /opt/noyta
dc="docker compose -f docker-compose.prod.yml --env-file .env --env-file .deploy.env"
$dc ps
$dc logs -f --tail=100 api worker
docker stats --no-stream                           # memory next to interviewpilot
```

Then in the browser:

1. Sign up with email OTP. This checks Resend.
2. Upload a photo. This checks the Spaces upload, CORS and ACL; the image URL should open in a private window.
3. Render a card or video. This checks the worker (the first render after an idle spell starts Chrome, about a second).
4. Pay with Razorpay. This checks the webhook.

---

## Rollback & operations

- **Automatic:** if `/api/health/ready` fails after a deploy, `deploy.sh` restores the previous images and the run fails. If the pull or a migration fails, the running containers are never touched.
- **Manual rollback** to any earlier build (the current and previous tags stay on disk; older ones are pulled again):

  ```bash
  sudo -u deploy /opt/noyta/deploy.sh ghcr.io/vishalp-65/noyta <old-sha>
  ```

- **Migrations** only move forward, so roll back code only to a sha whose schema is still compatible. Neon's point-in-time restore (branch from a timestamp) is the safety net for the database.
- **Disk:** each deploy keeps only the current and previous Noyta images and prunes dangling layers. interviewpilot's images are never touched. Container logs are capped at 30 MB per service.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| API exits at boot with `Invalid environment configuration` | A required key is missing in `/opt/noyta/.env` (the log lists which) |
| `Missing production configuration: ...` | OpenRouter/Razorpay keys are required in production |
| Upload fails with 403 `SignatureDoesNotMatch` | Wrong Spaces region/endpoint, or the bucket name is included in `S3_ENDPOINT` (it must be just `https://blr1.digitaloceanspaces.com`) |
| Upload blocked by CORS | Bucket CORS is missing `https://noyta.in` |
| Uploaded image gives 403 when opened | `S3_PUBLIC_READ_ACL` is not `true` |
| Worker restarts / exit 137 | Out of memory. Check `swapon --show` (re-run `bootstrap.sh` if empty), keep `REMOTION_CONCURRENCY=1`, lower `OFFTHREAD_VIDEO_CACHE_MB`; if it persists, the droplet needs 4 GB |
| API slow while a video renders | Expected on 1 vCPU, but it should stay usable. If not, lower the worker's `cpu_shares` in the compose file or resize to 2 vCPU |
| Deploy fails at `migrate` | Check `DATABASE_URL_DIRECT` (Neon direct string). The old containers are still running |
| WhatsApp webhook "could not be verified" | API not live yet, or the verify token differs from `WHATSAPP_VERIFY_TOKEN` |
| WhatsApp send error `132001` | Template name/language mismatch, or the template isn't approved yet |
| Login doesn't stick on noyta.in | `APP_URL` must be `https://noyta.in` and browsers must reach the API through noyta.in/api (Vercel rewrite). Keep `COOKIE_DOMAIN` empty: host-only cookies are never sent to subdomains |
| API exits with `CLIENT_IP_SECRET is required in production` | Set it on Vercel first (redeploy web), then in `/opt/noyta/.env` |
