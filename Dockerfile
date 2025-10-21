# Use Node.js 18 LTS
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Install TypeScript globally for building
RUN npm install -g typescript ts-node

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN echo "registry=https://registry.npmjs.org/" > .npmrc
RUN npm install --legacy-peer-deps --verbose

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies for production
RUN npm prune --production

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/voice-server.js"]