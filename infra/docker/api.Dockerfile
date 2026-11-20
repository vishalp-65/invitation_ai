# syntax=docker/dockerfile:1.7
# Layer order: manifests -> npm ci (cached) -> sources -> build, so code-only changes skip the install.
FROM node:24-bookworm-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/ai/package.json packages/ai/
COPY packages/db/package.json packages/db/
COPY packages/infra/package.json packages/infra/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace @cardai/api --include-workspace-root --ignore-scripts

FROM deps AS build
COPY turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npx turbo run build --filter=@cardai/api... \
 && npm prune --omit=dev --workspace @cardai/api --include-workspace-root \
 && rm -rf packages/templates packages/*/src apps/api/src

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/packages ./packages
# Whole app folder: dist, package.json and its nested node_modules (e.g. nanoid pinned per workspace)
COPY --from=build --chown=node:node /repo/apps/api ./apps/api
COPY --from=build --chown=node:node /repo/package.json ./package.json
USER node
EXPOSE 4000
# Each probe starts a short node process, so probe rarely; the deploy job gates on /api/health/ready itself.
HEALTHCHECK --interval=60s --timeout=5s --start-period=30s CMD node -e "fetch('http://localhost:'+(process.env.API_PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]
