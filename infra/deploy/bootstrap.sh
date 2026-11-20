#!/usr/bin/env bash
# One-time droplet setup for Noyta. Safe to re-run: every step checks before it changes anything.
# It never touches /opt/interviewpilot, its containers, images or nginx sites.
#
#   scp -r infra/deploy root@<droplet-ip>:/root/noyta-deploy
#   ssh root@<droplet-ip> bash /root/noyta-deploy/bootstrap.sh
#
# Does: Docker check -> deploy user + /opt/noyta -> GitHub Actions SSH key -> swap
#       -> nginx site for api.noyta.in -> HTTPS with certbot (once DNS points here)
set -euo pipefail

DOMAIN="${API_DOMAIN:-api.noyta.in}"
APP_DIR=/opt/noyta
PORT=4100
SWAP_SIZE="${SWAP_SIZE:-2G}"
HERE="$(cd "$(dirname "$0")" && pwd)"

step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
[ "$(id -u)" = 0 ] || { echo "Run as root"; exit 1; }

step "Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version

step "Deploy user and $APP_DIR"
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -o deploy -g deploy "$APP_DIR"
install -o deploy -g deploy -m 644 "$HERE/docker-compose.prod.yml" "$APP_DIR/docker-compose.prod.yml"
install -o deploy -g deploy -m 755 "$HERE/deploy.sh" "$APP_DIR/deploy.sh"
[ -f "$APP_DIR/.env" ] && chown deploy:deploy "$APP_DIR/.env" && chmod 600 "$APP_DIR/.env"

step "SSH key for GitHub Actions"
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
if grep -q 'github-actions-noyta' /home/deploy/.ssh/authorized_keys; then
  echo "Already installed (delete its line in /home/deploy/.ssh/authorized_keys and re-run to rotate)."
else
  tmp="$(mktemp -d)"
  ssh-keygen -q -t ed25519 -N "" -C github-actions-noyta -f "$tmp/key"
  cat "$tmp/key.pub" >> /home/deploy/.ssh/authorized_keys
  echo "Paste ALL of this into the GitHub secret DO_SSH_KEY (it is not stored anywhere else):"
  cat "$tmp/key"
  shred -u "$tmp/key" "$tmp/key.pub" && rmdir "$tmp"
fi
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys

step "Swap"
if [ -n "$(swapon --show --noheadings)" ]; then
  swapon --show
else
  fallocate -l "$SWAP_SIZE" /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Use swap only under pressure (render spikes), not for normal page cache churn
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-noyta-swap.conf && sysctl -q -p /etc/sysctl.d/99-noyta-swap.conf
  echo "Added $SWAP_SIZE swap"
fi

step "Port $PORT"
if ss -tlnH "sport = :$PORT" | grep -q . && ! docker ps --format '{{.Names}}' | grep -q '^noyta-api'; then
  echo "Port $PORT is taken by something else. Set API_HOST_PORT in $APP_DIR/.env and in the nginx site."
fi

step "nginx site for $DOMAIN"
web_owner="$(ss -tlnpH 'sport = :80' | grep -o 'users:(("[^"]*' | head -1 | cut -d'"' -f2 || true)"
if [ -n "$web_owner" ] && [ "$web_owner" != nginx ]; then
  echo "Port 80 belongs to '$web_owner', not host nginx. Route $DOMAIN -> 127.0.0.1:$PORT in that proxy instead"
  echo "(see 'Step 0' in docs/DEPLOYMENT.md). Skipping nginx and certbot."
  exit 0
fi
command -v nginx >/dev/null || { apt-get update -qq && apt-get install -y -qq nginx; }
# certbot later edits this file in place (443 block), so it is only written the first time
site="/etc/nginx/sites-available/$DOMAIN"
if [ -f "$site" ]; then echo "$site exists, left as is"; else sed "s/api\.noyta\.in/$DOMAIN/g" "$HERE/nginx-api.noyta.in.conf" > "$site"; fi
ln -sfn "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
nginx -t && systemctl reload nginx

step "HTTPS"
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "Certificate exists; certbot's timer renews it."
else
  ip="$(curl -fsS --max-time 3 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address || true)"
  dns="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)"
  if [ -n "$ip" ] && [ "$ip" = "$dns" ]; then
    command -v certbot >/dev/null || apt-get install -y -qq certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" --redirect
  else
    echo "$DOMAIN resolves to '${dns:-nothing}', this droplet is '${ip:-unknown}'. Add the DNS A record, then re-run."
  fi
fi

step "Done"
cat <<EOF
Next:
  1. scp .env.production root@<droplet-ip>:$APP_DIR/.env   (then re-run this script to fix its owner/mode)
  2. GitHub secrets DO_HOST, DO_USER=deploy, DO_SSH_KEY (above), GHCR_PULL_TOKEN
  3. Actions -> backend -> Run workflow
EOF
