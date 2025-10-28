# Multi-stage build for URL-to-Markdown parser
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Copy dependencies and code from build stage
COPY --from=build /app /app

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R node:node /app

# Run as non-root user
USER node

# Expose parser API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "server.js"]
