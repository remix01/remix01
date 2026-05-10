# Multi-stage Dockerfile for Next.js 16 production deployment
# Stage 1: Dependencies
FROM node:24-alpine AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.9

# Copy package files
COPY pnpm-lock.yaml package.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prefer-offline

# Stage 2: Build
FROM node:24-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.9

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml package.json ./

# Copy source code
COPY . .

# Build Next.js application
# These env vars are available at build time (used by next.config.ts)
RUN --mount=type=secret,id=build_env \
    set -a && . /run/secrets/build_env && set +a && \
    pnpm run build

# Stage 3: Runtime
FROM node:24-alpine AS runner
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.9

# Create non-root user
RUN addgroup --gid 1001 -S nodejs && \
    adduser --uid 1001 -S nextjs -G nodejs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "server.js"]
