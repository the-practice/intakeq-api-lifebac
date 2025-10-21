#!/bin/bash

# Update Dependencies Script
# Regenerates lock files to match package.json

echo "🔄 Updating dependencies and lock files..."

# Remove old lock files
echo "🗑️  Removing old lock files..."
rm -f package-lock.json
rm -f yarn.lock

# Clean node_modules
echo "🧹 Cleaning node_modules..."
rm -rf node_modules

# Install with npm to generate new package-lock.json
echo "📦 Installing with npm..."
npm install

# Also generate yarn.lock for compatibility
echo "🧶 Generating yarn.lock..."
yarn install

echo "✅ Dependencies updated successfully!"
echo ""
echo "📋 Lock files regenerated:"
echo "   • package-lock.json"
echo "   • yarn.lock"
echo ""
echo "🚀 You can now build and deploy without lock file conflicts."