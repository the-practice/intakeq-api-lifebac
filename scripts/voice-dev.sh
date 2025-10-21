#!/bin/bash

# Voice Server Development Script
# Runs the Bland.ai webhook server in development mode with auto-reload

echo "🎤 Starting IntakeQ Voice Assistant Server (Development Mode)"
echo "================================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Copying .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your actual configuration values before running again."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set development environment
export NODE_ENV=development

# Run the voice server with ts-node for development
echo "🚀 Starting voice server on port ${PORT:-3000}..."
npx ts-node -r dotenv/config src/voice-server.ts