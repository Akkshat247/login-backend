# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:18-alpine AS deps

WORKDIR /app

# Copy manifests first so Docker layer-caches npm install
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:18-alpine AS runner

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY server.js ./

# Ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Environment
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Health check — polls /health every 30 s, fails after 3 retries
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]