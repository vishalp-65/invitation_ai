# syntax=docker/dockerfile:1.7
# Worker = Node + Remotion renderer + Chrome Headless Shell. The image ships only what renders need:
# compiled dist, the prebuilt Remotion bundle (card/video templates), production node_modules and
# Chrome. Webpack/rspack (@remotion/bundler), TypeScript and template sources stay in the build stage.

# ---- deps: manifests first so code-only changes reuse the npm ci layer ----
FROM node:24-bookworm-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/ai/package.json packages/ai/
COPY packages/db/package.json packages/db/
COPY packages/infra/package.json packages/infra/
COPY packages/shared/package.json packages/shared/
COPY packages/templates/package.json packages/templates/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace @cardai/worker --include-workspace-root

# ---- build: compile, bundle templates, drop dev deps, then fetch Chrome ----
FROM deps AS build
COPY turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker
# The bundle is made at build time so the worker never runs webpack (faster boot, ~400 MB less peak RAM).
# @remotion/google-fonts is only used inside that bundle; prune keeps it because apps/web also needs it.
RUN npx turbo run build --filter=@cardai/worker... \
 && npm run bundle -w @cardai/worker \
 && npm prune --omit=dev --workspace @cardai/worker --include-workspace-root \
 && rm -rf packages/templates packages/*/src apps/worker/src node_modules/@remotion/google-fonts node_modules/@rspack
# After the prune, so it is not swept away: lands in /repo/node_modules/.remotion, read at runtime.
RUN node -e "require('@remotion/renderer').ensureBrowser()"

# ---- runtime: Chrome's system libraries + the pruned app ----
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxrandr2 \
      libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 \
      fonts-noto-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/worker ./apps/worker
USER node
CMD ["node", "apps/worker/dist/main.js"]
