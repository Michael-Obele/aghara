# syntax=docker/dockerfile:1
# Aghara MCP — standalone TMCP server (Streamable HTTP + STDIO). Deployed on Fly.io.
FROM oven/bun:1-slim
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000
CMD ["bun", "src/index.ts"]