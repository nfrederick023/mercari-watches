
FROM node:18-alpine as base

FROM base AS deps
WORKDIR /app

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat

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

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Installs packages for Chromium.
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  nodejs \
  yarn

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy over the build files and deps
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
RUN chown nestjs:nodejs /app

USER nestjs
EXPOSE 3080

CMD ["node", "dist/main.js"]