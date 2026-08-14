# syntax=docker/dockerfile:1
#
# `npm run build` is `vite build && nitro build`. Nitro's node-server preset emits a
# self-contained bundle at .output (~7.5 MB) whose only runtime requirement is node --
# no node_modules, no src, no vite config. The runner stage therefore copies .output and
# nothing else.

# ---------------------------------------------------
# Stage 1: Base image
# ---------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# ---------------------------------------------------
# Stage 2: Install dependencies
# ---------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---------------------------------------------------
# Stage 3: Dev server -- `docker compose --profile dev up app-dev`
# ---------------------------------------------------
# The source tree is bind-mounted over /app by compose; this stage exists so the image
# carries a node_modules built for the container's platform rather than the host's.
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# ---------------------------------------------------
# Stage 4: Build the application
# ---------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build phase
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV NODE_ENV=production

RUN npm run build

# ---------------------------------------------------
# Stage 5: Production runner
# ---------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 tanstack

COPY --chown=tanstack:nodejs --from=builder /app/.output ./.output

USER tanstack

EXPOSE 3000

# The nitro server entry: serves SSR, server routes and the static assets from
# .output/public. `vite preview` would serve the client build only.
CMD ["node", ".output/server/index.mjs"]
