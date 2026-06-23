FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace=@verida/api --workspace=@verida/shared

# Build shared package
COPY packages/shared/ packages/shared/
RUN npm run build --workspace=@verida/shared

# Build API
COPY apps/api/ apps/api/
COPY tsconfig.base.json ./
COPY drizzle.config.ts ./
RUN npm run build --workspace=@verida/api

# Production image
FROM node:22-alpine AS production
RUN corepack enable
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/shared/package.json ./packages/shared/
COPY --from=base /app/drizzle.config.ts ./

WORKDIR /app/apps/api

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "dist/index.js"]
