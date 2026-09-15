# Stage 1: Build TypeScript and Generate Prisma Client
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci

RUN npx prisma generate

COPY src ./src

RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# Copy node_modules (including generated Prisma client engine) from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create uploads directory for file attachments
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["node", "dist/server.js"]
