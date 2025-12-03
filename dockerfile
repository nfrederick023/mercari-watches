
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app

# Copy package.json and install
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app

# Copy deps, and all other files, to Build 
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy over the build files and deps
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
RUN chown nestjs:nodejs /app

USER nestjs
EXPOSE 3080

CMD ["node", "dist/main.js"]