FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/shell/package.json ./apps/shell/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY apps/transactions/package.json ./apps/transactions/
COPY packages/design-system/package.json ./packages/design-system/
COPY packages/utils/package.json ./packages/utils/
COPY packages/types/package.json ./packages/types/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx turbo build --filter=@bytebank/transactions

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/transactions/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/transactions/.next/static ./apps/transactions/.next/static
USER nextjs
EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/transactions/server.js"]
