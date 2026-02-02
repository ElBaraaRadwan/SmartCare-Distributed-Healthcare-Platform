FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package (optional context)
COPY package*.json ./

# Copy frontend source
COPY apps/frontend ./apps/frontend

# Install dependencies
WORKDIR /app/apps/frontend
RUN npm install

# Build
RUN npm run build

# --- Runner Stage ---
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy public assets
COPY --from=builder /app/apps/frontend/public ./public

# Copy standalone build
# This puts server.js at /app/server.js (if built as single app root)
COPY --from=builder /app/apps/frontend/.next/standalone ./

# Copy static assets
COPY --from=builder /app/apps/frontend/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
