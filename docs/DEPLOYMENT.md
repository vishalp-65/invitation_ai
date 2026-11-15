# Deployment: backend on DigitalOcean, frontend on Vercel

Flow: browser -> Vercel (Next.js) -> `/api/*` rewrite -> `https://api.<domain>` -> nginx on droplet -> `127.0.0.1:4100` (cardai api container).
Cookies stay first-party because the web app proxies `/api`.

## 1. One-time droplet setup (SSH in as root)

```bash
# Docker (skip if the other backend already uses it)
curl -fsSL https://get.docker.com | sh
adduser --disabled-password --gecos "" deploy && usermod -aG docker deploy
mkdir -p /opt/cardai && chown deploy:deploy /opt/cardai
mkdir -p /home/deploy/.ssh && ssh-keygen -t ed25519 -f ./gh_deploy -N "" -C github-actions
cat gh_deploy.pub >> /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
cat gh_deploy     # copy into the GitHub secret DO_SSH_KEY, then: shred -u gh_deploy gh_deploy.pub
```

Coexisting with the other backend:

- Our project is named `cardai` with its own network and volumes; only the API is published, on `127.0.0.1:4100`. Check `ss -tlnp` to make sure 4100 is free (change it in the compose file and nginx if not).
- Postgres and Redis are not published. They are internal to the cardai network.
- Worker (Remotion) is heavy. `WORKER_MEMORY` defaults to 3g. Check `free -h`. On a droplet under 8 GB RAM, add swap or move the worker elsewhere.
  - Memory knobs (env): `RENDER_CONCURRENCY` (parallel jobs, default 2), `REMOTION_CONCURRENCY` (Chrome tabs per video, default CPUs ÷ jobs, max 4), `OFFTHREAD_VIDEO_CACHE_MB` (default 256), `BROWSER_RECYCLE_AFTER` (relaunch Chrome every N jobs, default 40). For a 3g limit, `RENDER_CONCURRENCY=1` with 3–4 tabs is the safe setting.

### Reverse proxy (assumes the existing backend already uses nginx on 80/443)

```bash
cat > /etc/nginx/sites-available/cardai-api <<'CONF'
server {
  server_name api.example.com;
  client_max_body_size 25m;
  location / {
    proxy_pass http://127.0.0.1:4100;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
CONF
ln -s /etc/nginx/sites-available/cardai-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.example.com
```

Add a DNS **A record** `api.example.com` -> droplet IP first. If the other backend uses Caddy or Traefik instead, route `api.example.com` to `127.0.0.1:4100` there.

### Server env file

```bash
sudo -u deploy nano /opt/cardai/.env
```

Copy keys from `.env.example` with production values, plus `POSTGRES_PASSWORD=<strong random>`. Important values:

```
NODE_ENV=production
APP_URL=https://example.com
NEXT_PUBLIC_APP_URL=https://example.com
COOKIE_DOMAIN=.example.com        # only if web and api share a parent domain
S3_* / STORAGE_PUBLIC_URL         # use Cloudflare R2 or DO Spaces, not local minio
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, RESEND_API_KEY, OPENROUTER_API_KEY, RAZORPAY_*, WHATSAPP_*, GOOGLE_*
```

`DATABASE_URL` and `REDIS_URL` are injected by the compose file. Do not set them in `.env`.
`chmod 600 /opt/cardai/.env`.

## 2. GitHub setup

Repo -> Settings -> Environments -> create `production`, then Secrets (Actions):

| Secret | Value |
| --- | --- |
| `DO_HOST` | droplet IP |
| `DO_USER` | `deploy` |
| `DO_SSH_KEY` | private key from step 1 |
| `GHCR_PULL_TOKEN` | classic PAT with `read:packages` (droplet pulls private images) |

Push to `main` touching backend paths and the `backend` workflow runs: verify -> build api and worker images (GHA layer cache) -> push to GHCR -> SSH deploy -> migrate -> restart -> health check.
Manual run: Actions -> backend -> Run workflow.

Rollback:

```bash
cd /opt/cardai
export REGISTRY_IMAGE_API=ghcr.io/<owner>/cardai-api:<old-sha> REGISTRY_IMAGE_WORKER=ghcr.io/<owner>/cardai-worker:<old-sha>
docker compose -f docker-compose.prod.yml --env-file .env up -d api worker
```

Seed the first admin or data once (optional):

```bash
docker compose -f docker-compose.prod.yml --env-file .env run --rm --no-deps api node packages/db/dist/seed.js
```

Backups: `docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U cardai cardai | gzip > ~/cardai-$(date +%F).sql.gz` (cron it, or switch to DO Managed Postgres and set `DATABASE_URL` yourself).

## 3. Frontend on Vercel

```bash
npm i -g vercel
vercel login
cd apps/web
vercel link          # create project, set Root Directory to apps/web
```

In the Vercel dashboard -> Project -> Settings:

- **Root Directory**: `apps/web`, and tick **Include source files outside of the Root Directory** (monorepo workspaces).
- **Install Command**: `cd ../.. && npm ci`
- **Build Command**: `cd ../.. && npx turbo run build --filter=@cardai/web...`
- **Node**: 24.x
- Environment variables (Production):

```
API_INTERNAL_URL=https://api.example.com
NEXT_PUBLIC_APP_URL=https://example.com
STORAGE_PUBLIC_URL=https://<your R2/Spaces public URL>
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
NEXT_PUBLIC_SHORT_HOST=...        # if using short links
```

```bash
vercel env add API_INTERNAL_URL production     # or set in dashboard
vercel --prod                                   # first deploy; afterwards pushes to main auto-deploy
```

Then Domains -> add `example.com` and point DNS at Vercel (A `76.76.21.21` or CNAME `cname.vercel-dns.com`).
Update Google OAuth redirect URI to `https://example.com/api/auth/google/callback` and the Razorpay/WhatsApp webhook URLs to `https://example.com/api/...`.

## 4. Verify

```bash
curl -i https://api.example.com/api/health
curl -i https://example.com/api/health      # goes through the Vercel rewrite
docker compose -f /opt/cardai/docker-compose.prod.yml ps
docker compose -f /opt/cardai/docker-compose.prod.yml logs -f api worker
```
