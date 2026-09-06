# syntax=docker/dockerfile:1
# Aghara — single Node/Bun process (UI + REST + in-process cron).
# Build with adapter-node, run migrations, then start the server.

FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# Koyeb/Docker build has no runtime env — provide dummy build-time vars so
# `vite build` (which imports server code) doesn't throw. Real values come
# from Koyeb env at runtime.
ARG DATABASE_URL=postgresql://build:dummy@localhost:5432/build
ARG BETTER_AUTH_SECRET=build_dummy_secret_32_chars_long_xxxx
ARG APP_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
ARG ORIGIN=http://localhost:8000
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

# Build output (adapter-node) + migrations + runtime deps.
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./
COPY --from=build /app/bun.lock ./
RUN bun install --frozen-lockfile --production

EXPOSE 8000
# Migrate once at boot, then serve. Health check: /api/v1/health
CMD ["sh", "-c", "bun scripts/migrate.ts && bun ./build/index.js"]