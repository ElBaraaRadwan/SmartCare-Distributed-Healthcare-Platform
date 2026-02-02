FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy the SHARED LIBRARY
COPY packages/common ./packages/common

# Copy the SERVICE
COPY services/prescription-service ./services/prescription-service

# Install dependencies for the specific service
WORKDIR /app/services/prescription-service
RUN npm install

# Build the service
RUN npm run build

# --- Production Stage ---
FROM node:18-alpine AS production

WORKDIR /app

# Copy built assets
COPY --from=builder /app/services/prescription-service/dist ./dist
COPY --from=builder /app/services/prescription-service/node_modules ./node_modules
COPY --from=builder /app/services/prescription-service/package.json ./
COPY --from=builder /app/services/prescription-service/prisma ./prisma

EXPOSE 4003

CMD ["node", "dist/main"]
