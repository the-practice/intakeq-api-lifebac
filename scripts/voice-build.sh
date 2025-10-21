#!/bin/bash

# Voice Server Production Build Script
# Builds the project and sets up for production deployment

echo "🏗️  Building IntakeQ Voice Assistant for Production"
echo "================================================="

# Remove old dist
rm -rf dist

# Build the TypeScript project
echo "📦 Building TypeScript..."
npx tsc

# Copy package.json and other necessary files to dist
echo "📄 Copying configuration files..."
cp package.json dist/
cp .env.example dist/

# Install production dependencies in dist
echo "⬇️  Installing production dependencies..."
cd dist && npm install --production && cd ..

echo "✅ Build complete!"
echo ""
echo "🚀 To start the production server:"
echo "   cd dist"
echo "   cp .env.example .env"
echo "   # Edit .env with your production values"
echo "   node voice-server.js"
echo ""
echo "🌐 For deployment to cloud platforms:"
echo "   • Railway: Connect your GitHub repo and set environment variables"
echo "   • Vercel: Add 'node voice-server.js' as your start command"
echo "   • Heroku: Ensure your Procfile contains 'web: node voice-server.js'"