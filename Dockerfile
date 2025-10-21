# Use Node.js 18 LTS
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN echo "registry=https://registry.npmjs.org/" > .npmrc
RUN npm install --legacy-peer-deps --verbose

# Copy source code and TypeScript configs
COPY src/ ./src/
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Build the application using build-specific TypeScript config
RUN npx tsc -p tsconfig.build.json

# Copy other necessary files for runtime
COPY .env.example ./

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
CMD ["npm", "run", "voice-server"]