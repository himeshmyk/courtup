# ---- Single-container build: builds the web PWA + API, API serves both ----
FROM node:20-slim AS build
WORKDIR /app

# OpenSSL is needed by Prisma engines
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install all workspace deps (root + apps)
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm install

# Copy sources
COPY . .

# Build web (relative /api calls -> same origin) and API; generate Prisma client
ARG VITE_API_BASE=""
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build -w apps/web \
  && npm run db:generate -w apps/api \
  && npm run build -w apps/api

# ---- Runtime image ----
FROM node:20-slim AS runtime
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV SERVE_STATIC=true
# Cloud Run / hosts inject PORT; default to 8080
ENV PORT=8080
# SQLite by default (ephemeral on Cloud Run). For persistence, set DATABASE_URL
# to a Postgres/Cloud SQL URL and change provider in prisma/schema.prisma.
ENV DATABASE_URL="file:./prod.db"

# Copy built artifacts + node_modules
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/api
EXPOSE 8080

# Push schema + seed (SQLite) on first boot, then start. For Postgres, the same
# `db push` applies the schema to your Cloud SQL instance.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts || true; node dist/index.js"]
