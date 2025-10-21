const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building IntakeQ Voice Assistant...');

// Clean dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  console.log('🧹 Cleaning dist directory...');
  fs.rmSync(distDir, { recursive: true, force: true });
}

try {
  // Build with TypeScript
  console.log('📦 Compiling TypeScript...');
  execSync('npx tsc', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
  console.log('');
  console.log('🚀 To start the voice server:');
  console.log('   npm run voice-server');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}