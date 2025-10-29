FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src/ ./src/

# Create logs directory
RUN mkdir -p /app/logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

CMD ["node", "src/server.js"]
