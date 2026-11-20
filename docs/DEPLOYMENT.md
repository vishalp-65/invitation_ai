# Deploying Noyta

```
Browser ──► noyta.in (Vercel, Next.js) ──/api/* rewrite──► api.noyta.in (nginx on droplet) ──► 127.0.0.1:4100  noyta-api container
                                                                                               noyta-worker container (Remotion renders)
api + worker ──► Neon Postgres · Upstash Redis · DigitalOcean Spaces (media) · Resend · OpenRouter · Razorpay · WhatsApp Cloud API
```

- The backend runs on the existing droplet as its own compose project (`noyta`) in `/opt/noyta`. It never touches `/opt/interviewpilot`.
- Only the API is published, on loopback port **4100**. nginx on the host maps `api.noyta.in` to it.
- The browser calls `noyta.in/api/*`, and Vercel proxies those calls to `api.noyta.in`, so cookies stay first-party.
- CI/CD (`.github/workflows/backend.yml`): on a push to `main` that touches backend code, it runs typecheck, lint and test, builds the `api` and `worker` images, pushes them to GHCR, then SSHes to the droplet to migrate, restart and run a health check, rolling back automatically if the check fails. Pull requests run the verify step only.
- Vercel deploys the frontend on its own, from every push.

Files involved:

| File | Purpose |
| --- | --- |
| `infra/docker/api.Dockerfile`, `infra/docker/worker.Dockerfile` | Images |
| `infra/deploy/docker-compose.prod.yml` | What runs on the droplet (CI copies it on every deploy) |
| `infra/deploy/nginx-api.noyta.in.conf` | nginx site for `api.noyta.in` |
| `infra/storage/cors.prod.json` | CORS for the Spaces bucket |
| `.env.production` (local, git-ignored) | Production env with generated JWT and verify-token secrets. Fill it, copy it to the droplet, then keep it out of the repo. |

---

## Step 0: Look at the droplet first (5 min)

```bash
ssh root@<droplet-ip>
free -h && nproc && df -h /          # RAM / CPU / disk available for the worker
docker ps --format '{{.Names}}\t{{.Ports}}'
ss -tlnp | grep -E ':(80|443|4100)\b'
```

Check three things:

1. **Who owns ports 80/443?**
   - If it's `nginx` on the host (systemd), follow step 4 as written.
   - If it's a Docker container (interviewpilot's nginx/Caddy/Traefik), add `api.noyta.in → host:4100` in that proxy instead. The container must be able to reach the host's loopback: use `network_mode: host`, or bind our API to the docker bridge IP and point the proxy at it.
2. **Is port 4100 free?** If not, pick another port. Change it in `docker-compose.prod.yml` (`API_HOST_PORT`), in the nginx file, and in the health-check URL in the workflow.
3. **RAM.** The worker runs headless Chrome for video renders.

| Droplet RAM free | Set in `.env` |
| --- | --- |
| ≥ 4 GB free | `WORKER_MEMORY=3g`, `RENDER_CONCURRENCY=1`, `REMOTION_CONCURRENCY=3` |
| ~2 GB free | `WORKER_MEMORY=1536m`, `RENDER_CONCURRENCY=1`, `REMOTION_CONCURRENCY=1` and add swap (below) |
| < 2 GB free | Resize the droplet (2 vCPU / 4 GB minimum recommended), or run the worker elsewhere |

`WORKER_MEMORY` / `API_MEMORY` are read by compose from `/opt/noyta/.env`.

Add 4 GB of swap (safe alongside interviewpilot):

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Step 1: DNS (at your noyta.in registrar / DNS host)

| Type | Name | Value |
| --- | --- | --- |
| A | `api` | droplet IPv4 |
| A | `@` | `76.76.21.21` (Vercel), or the value Vercel shows in step 6 |
| CNAME | `www` | `cname.vercel-dns.com` |

Resend's DNS records (SPF/DKIM/DMARC for `noyta.in`) should already exist. If not: Resend → Domains → `noyta.in`.

Check with `nslookup api.noyta.in` before running certbot.

---

## Step 2: Storage (DigitalOcean Spaces)

**Is storage required? Yes.** It holds user uploads (photos, logos, card scans), the guest photo album, the rendered cards, PDFs and videos made by the worker, and the AI images. The API never stores files on its own disk. The browser uploads straight to the bucket with a presigned URL, and the bucket's CDN serves the files.

The storage code (`packages/infra/src/storage.ts`) is S3-compatible, so Spaces works without new code. One change was made for Spaces: it has no "public bucket" policy, so with `S3_PUBLIC_READ_ACL=true` every object is written `public-read`. That covers both server uploads and browser presigned uploads; the API returns the `x-amz-acl` header to the browser for those.

1. DigitalOcean → **Spaces Object Storage → Create Bucket**.
   - Region: **BLR1 (Bangalore)** if offered, otherwise SGP1. If you pick SGP1, put `sgp1` in `S3_ENDPOINT`, `S3_REGION` and `STORAGE_PUBLIC_URL`.
   - **Enable CDN**: yes.
   - Name: `noyta-media`.
   - File listing: **Restricted**. Objects are still readable one by one; only the folder listing is hidden.
2. **Spaces Object Storage → Access Keys → Create Access Key**. Give it Limited access, scoped to `noyta-media` with Read/Write/Delete. Copy the key and secret into `.env.production` (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`). The secret is shown only once.
3. **CORS**, so the browser can PUT uploads. Either:
   - Bucket → Settings → CORS Configurations → add origin `https://noyta.in` (and `https://www.noyta.in`), methods GET/PUT/HEAD, allowed header `*`, max age 3600. Or:
   - With the AWS CLI:

     ```bash
     aws s3api put-bucket-cors --endpoint-url https://blr1.digitaloceanspaces.com \
       --bucket noyta-media --cors-configuration file://infra/storage/cors.prod.json
     ```

4. Set `STORAGE_PUBLIC_URL=https://noyta-media.blr1.cdn.digitaloceanspaces.com` (the bucket's CDN endpoint, shown in its Settings).
   - Optional: use `cdn.noyta.in` instead. Bucket → Settings → CDN → Custom subdomain. This needs a certificate: DO issues Let's Encrypt automatically only if `noyta.in` DNS is hosted at DigitalOcean; otherwise upload one. Then update `STORAGE_PUBLIC_URL` in `.env` and in Vercel.

Cost: $5/month includes 250 GB storage and 1 TB of CDN transfer.

---

## Step 3: Droplet setup (once, as root)

```bash
# Docker is probably already installed for interviewpilot; check:
docker compose version || curl -fsSL https://get.docker.com | sh

# Dedicated deploy user for GitHub Actions (can run docker, nothing else special)
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /opt/noyta && chown deploy:deploy /opt/noyta

# SSH key that GitHub Actions will use
ssh-keygen -t ed25519 -f /root/gh_deploy -N "" -C github-actions-noyta
mkdir -p /home/deploy/.ssh
cat /root/gh_deploy.pub >> /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
cat /root/gh_deploy        # copy the WHOLE private key into the GitHub secret DO_SSH_KEY (step 5)
shred -u /root/gh_deploy /root/gh_deploy.pub
```

**Env file.** On your PC, fill every `<...>` in `.env.production` at the repo root:

- `DATABASE_URL`: Neon's **pooled** string. `DATABASE_URL_DIRECT`: the direct one, used for migrations.
- `REDIS_URL`: Upstash's `rediss://` URL.
- `RESEND_API_KEY`: your main Resend key.
- Plus the Spaces, Razorpay, OpenRouter, Google and WhatsApp values.

The JWT secrets and the WhatsApp verify token are already generated. Then copy the file up:

```bash
scp .env.production root@<droplet-ip>:/opt/noyta/.env
ssh root@<droplet-ip> "chown deploy:deploy /opt/noyta/.env && chmod 600 /opt/noyta/.env"
```

If you need to generate a new secret later:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Step 4: nginx + HTTPS for api.noyta.in

```bash
# from your PC
scp infra/deploy/nginx-api.noyta.in.conf root@<droplet-ip>:/etc/nginx/sites-available/api.noyta.in
```

```bash
# on the droplet
ln -s /etc/nginx/sites-available/api.noyta.in /etc/nginx/sites-enabled/api.noyta.in
nginx -t && systemctl reload nginx
apt-get install -y certbot python3-certbot-nginx     # skip if interviewpilot already uses certbot
certbot --nginx -d api.noyta.in --redirect
```

certbot renews automatically through its systemd timer. Check with `systemctl list-timers | grep certbot`.

---

## Step 5: GitHub (CI/CD)

1. Push the repo to GitHub (`vishalp-65/invitation_ai`).
2. **Settings → Environments → New environment `production`**. Optionally add yourself as a required reviewer to approve every deploy.
3. In the `production` environment, add these **Secrets**:

| Secret | Value |
| --- | --- |
| `DO_HOST` | droplet IP |
| `DO_USER` | `deploy` |
| `DO_SSH_KEY` | the private key printed in step 3 |
| `GHCR_PULL_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens (classic) → scope **`read:packages`** only, so the droplet can pull private images |

4. **Settings → Actions → General → Workflow permissions**: "Read and write permissions". This lets the workflow push to GHCR with `GITHUB_TOKEN`.
5. First deploy: **Actions → backend → Run workflow** (or push to `main`). It runs:
   - `verify`: typecheck, lint and test.
   - `build`: builds and pushes `ghcr.io/vishalp-65/noyta-api:<sha>` and `ghcr.io/vishalp-65/noyta-worker:<sha>`.
   - `deploy`: copies the compose file, pulls, migrates Neon, swaps containers, waits for `/api/health/ready`, and rolls back if the check fails.

Seed data once, if you need it:

```bash
cd /opt/noyta
docker compose -f docker-compose.prod.yml --env-file .env --env-file .deploy.env run --rm --no-deps api node packages/db/dist/seed.js
```

---

## Step 6: Frontend on Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo.
2. Settings:
   - **Root Directory**: `apps/web`
   - Turn on "Include files outside the Root Directory" (it's the default for monorepos).
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
```

4. Deploy, then **Settings → Domains**:
   - Add `noyta.in` as primary.
   - Add `www.noyta.in` and set it to redirect to `noyta.in`.
   - Vercel shows the exact DNS records; they should match step 1.
5. From now on, every push to `main` deploys production and every PR gets a preview URL.
   - Preview URLs call the production API through the rewrite. Point the Preview env `API_INTERNAL_URL` elsewhere if you don't want that.

---

## Step 7: Third-party dashboards

| Service | Set to |
| --- | --- |
| Google Cloud → OAuth client | Authorised redirect URI `https://noyta.in/api/auth/google/callback`, JS origin `https://noyta.in` |
| Razorpay → Webhooks | `https://api.noyta.in/api/payments/webhook/razorpay` (secret = `RAZORPAY_WEBHOOK_SECRET`; events `payment.captured`, `order.paid`, `payment.failed`) |
| Resend → Webhooks | `https://api.noyta.in/api/mail/webhooks/resend` (events `email.bounced`, `email.complained`), then put the signing secret in `RESEND_WEBHOOK_SECRET` and redeploy |
| WhatsApp (Meta) | see the next section |

After editing `/opt/noyta/.env`, restart the containers. This does not need a new build:

```bash
cd /opt/noyta && docker compose -f docker-compose.prod.yml --env-file .env --env-file .deploy.env up -d --force-recreate api worker
```

---

## Step 8: WhatsApp Cloud API

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

## Step 9: Verify

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
3. Render a card or video. This checks the worker.
4. Pay with Razorpay. This checks the webhook.

---

## Rollback & operations

- **Automatic:** if `/api/health/ready` fails after a deploy, the job restores the previous images (`.deploy.prev.env`) and fails the run.
- **Manual:**

  ```bash
  cd /opt/noyta
  printf 'REGISTRY_IMAGE_API=ghcr.io/vishalp-65/noyta-api:<old-sha>\nREGISTRY_IMAGE_WORKER=ghcr.io/vishalp-65/noyta-worker:<old-sha>\n' > .deploy.env
  docker compose -f docker-compose.prod.yml --env-file .env --env-file .deploy.env up -d api worker
  ```

- **Migrations** only move forward, so roll back code only to a sha whose schema is still compatible. Neon's point-in-time restore (branch from a timestamp) is the safety net for the database.
- **Disk:** the deploy prunes only dangling layers, so interviewpilot's images are never touched. Clean up old Noyta tags occasionally:

  ```bash
  docker images 'ghcr.io/vishalp-65/noyta-*' --format '{{.Repository}}:{{.Tag}}' | tail -n +5 | xargs -r docker rmi
  ```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| API exits at boot with `Invalid environment configuration` | A required key is missing in `/opt/noyta/.env` (the log lists which) |
| `Missing production configuration: ...` | OpenRouter/Razorpay keys are required in production |
| Upload fails with 403 `SignatureDoesNotMatch` | Wrong Spaces region/endpoint, or the bucket name is included in `S3_ENDPOINT` (it must be just `https://blr1.digitaloceanspaces.com`) |
| Upload blocked by CORS | Bucket CORS is missing `https://noyta.in` |
| Uploaded image gives 403 when opened | `S3_PUBLIC_READ_ACL` is not `true` |
| Worker restarts / exit 137 | Out of memory; lower `REMOTION_CONCURRENCY`, raise `WORKER_MEMORY`, add swap |
| WhatsApp webhook "could not be verified" | API not live yet, or the verify token differs from `WHATSAPP_VERIFY_TOKEN` |
| WhatsApp send error `132001` | Template name/language mismatch, or the template isn't approved yet |
| Login works on api.noyta.in but not noyta.in | `COOKIE_DOMAIN` must be `.noyta.in`, and `APP_URL` must be `https://noyta.in` |
