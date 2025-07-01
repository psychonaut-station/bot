FROM oven/bun:alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json bun.lock .
RUN bun install --frozen-lockfile

FROM base AS runner

COPY --from=deps /app/node_modules node_modules
COPY . .

USER bun
ENTRYPOINT [ "bun", "run", "start" ]
