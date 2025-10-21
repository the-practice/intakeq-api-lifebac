# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Create a clean .npmrc for installation (no auth tokens)
RUN echo "registry=https://registry.npmjs.org/" > .npmrc

# Install dependencies
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies for smaller image
RUN yarn install --frozen-lockfile --production=true

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "voice-server"]