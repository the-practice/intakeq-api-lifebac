# Deployment Troubleshooting Guide

## Lock File Conflicts (Yarn/NPM)

If you encounter errors like:
- `Your lockfile needs to be updated, but yarn was run with --frozen-lockfile`
- `Error: Failed to replace env in config: ${NPM_TOKEN}`

### Quick Fix for Deployment:

The Docker configuration has been updated to handle this automatically by:
1. Using only `package.json` (ignoring lock files)
2. Installing dependencies fresh during build
3. Using npm instead of yarn for consistency

### For Local Development:

1. **Update dependencies script:**
   ```bash
   npm run update-deps
   ```

2. **Manual fix:**
   ```bash
   # Remove lock files
   rm -f package-lock.json yarn.lock
   rm -rf node_modules
   
   # Reinstall with legacy peer deps
   npm install --legacy-peer-deps
   ```

3. **Alternative - use npm only:**
   ```bash
   # Instead of yarn, use npm for everything
   npm install --legacy-peer-deps
   npm run build
   npm run voice-dev
   ```

## Build Script Issues

If you encounter `sh: ./scripts/build.sh: not found`, this is because:
- The shell scripts aren't copied to Docker containers
- The build process has been simplified to use TypeScript directly

### Build Commands:

```bash
# Simple TypeScript build (recommended)
npm run build

# Cross-platform build script
npm run build:cross-platform

# Legacy Rollup build (if needed)
npm run build:rollup
```

## Build Commands by Platform:

### Docker (Recommended)
```bash
docker build -t intakeq-voice .
docker run -p 3000:3000 -e INTAKEQ_API_KEY=your-key intakeq-voice
```

### Railway
```bash
# Automatically uses railway.json configuration
# Uses: npm install --legacy-peer-deps && npx tsc
```

### Vercel
```bash
# Build command: npm install --legacy-peer-deps && npx tsc
# Start command: npm run voice-server
```

### Manual/VPS
```bash
npm install --legacy-peer-deps
npm run build
npm run voice-server
```

## Environment Variables Required:

- `INTAKEQ_API_KEY` (required)
- `DEFAULT_PRACTITIONER_EMAIL` (optional)
- `TRANSFER_PHONE_NUMBER` (optional)
- `PORT` (optional, defaults to 3000)

## Testing the Deployment:

```bash
# Health check
curl http://localhost:3000/health

# Test command processing
curl -X POST http://localhost:3000/test-command \
  -H "Content-Type: application/json" \
  -d '{"transcript": "find john smith"}'
```