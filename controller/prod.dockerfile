# Production Dockerfile for Home Automation Controller
# Multi-stage build for optimized production image

# ---- Build Stage ----
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (needed for TypeScript compilation)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build 2>/dev/null || npx tsc

# ---- Production Stage ----
FROM node:24-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Switch to non-root user for security
USER node

# Expose application port
EXPOSE 3000

# Health check (adjust path as needed)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Production command
CMD ["node", "dist/index.js"]
