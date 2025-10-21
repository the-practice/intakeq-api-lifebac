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
echo "📦 Installing with npm (using legacy peer deps)..."
npm install --legacy-peer-deps

# Also generate yarn.lock for compatibility if yarn is available
if command -v yarn &> /dev/null; then
    echo "🧶 Generating yarn.lock..."
    yarn install
else
    echo "⚠️  Yarn not found, skipping yarn.lock generation"
fi

echo "✅ Dependencies updated successfully!"
echo ""
echo "📋 Lock files regenerated:"
echo "   • package-lock.json"
if [ -f yarn.lock ]; then
    echo "   • yarn.lock"
fi
echo ""
echo "🚀 You can now build and deploy without lock file conflicts."