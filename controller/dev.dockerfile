# Development Dockerfile for Home Automation Controller
# Optimized for development with hot-reload capabilities

FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install development tools
RUN apk add --no-cache git

# Create app directory with proper permissions
RUN chown -R node:node /app

# Switch to node user (UID 1000) - prevents root permission issues
USER node

# Copy package files (as node user)
COPY --chown=node:node package*.json ./

# Install ALL dependencies (including dev dependencies)
RUN npm ci

# Expose application port (default 3000, configurable via .env)
EXPOSE 3000

# Expose debug port for Node.js debugging
EXPOSE 9229

# Development command with hot-reload using tsx
# The --watch flag enables hot-reload
CMD ["npm", "run", "start"]
