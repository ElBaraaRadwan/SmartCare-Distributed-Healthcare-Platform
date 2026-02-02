FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files (if any config is needed, though root package.json is sparse)
COPY package*.json ./

# Copy the SHARED LIBRARY
COPY packages/common ./packages/common

# Copy the SERVICE
COPY services/auth-service ./services/auth-service

# Install dependencies for the specific service
WORKDIR /app/services/auth-service
RUN npm install

# Build the service
RUN npm run build

# --- Production Stage ---
FROM node:18-alpine AS production

WORKDIR /app

# Copy built assets
COPY --from=builder /app/services/auth-service/dist ./dist
COPY --from=builder /app/services/auth-service/node_modules ./node_modules
COPY --from=builder /app/services/auth-service/package.json ./
COPY --from=builder /app/services/auth-service/prisma ./prisma

EXPOSE 4001

CMD ["node", "dist/main"]
