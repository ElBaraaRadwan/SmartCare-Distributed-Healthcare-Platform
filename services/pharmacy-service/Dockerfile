FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy the SHARED LIBRARY
COPY packages/common ./packages/common

# Copy the SERVICE
COPY services/pharmacy-service ./services/pharmacy-service

# Install dependencies for the specific service
WORKDIR /app/services/pharmacy-service
RUN npm install

# Build the service
RUN npm run build

# --- Production Stage ---
FROM node:18-alpine AS production

WORKDIR /app

# Copy built assets
COPY --from=builder /app/services/pharmacy-service/dist ./dist
COPY --from=builder /app/services/pharmacy-service/node_modules ./node_modules
COPY --from=builder /app/services/pharmacy-service/package.json ./
COPY --from=builder /app/services/pharmacy-service/prisma ./prisma

EXPOSE 4004

CMD ["node", "dist/main"]
