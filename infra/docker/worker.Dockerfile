# syntax=docker/dockerfile:1.7
# Remotion needs Chrome Headless Shell's system libraries.
FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxrandr2 \
      libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 \
      fonts-noto-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /repo
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN npm ci --workspace @cardai/worker --include-workspace-root
RUN npx turbo run build --filter=@cardai/worker...
# Download Chrome Headless Shell at build time, not on first job.
RUN node -e "require('@remotion/renderer').ensureBrowser()"

FROM base
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo /repo
USER node
CMD ["node", "apps/worker/dist/main.js"]
