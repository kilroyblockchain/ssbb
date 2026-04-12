# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package*.json tsconfig.base.json ./
COPY apps/server/package*.json ./apps/server/

# Install all deps (including dev — needed for tsc)
RUN npm ci --workspace=apps/server

# Copy source and compile
COPY apps/server ./apps/server
RUN npm run build:server

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Only copy what's needed for prod install
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/

# Production deps only
RUN npm ci --workspace=apps/server --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist

EXPOSE 4000

# data/memory is ephemeral in ECS — conversations persist in S3
CMD ["node", "apps/server/dist/index.js"]
