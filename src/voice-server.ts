#!/usr/bin/env node

/**
 * Voice Server for Bland.ai Integration with IntakeQ API
 * 
 * This server handles webhooks from Bland.ai and processes voice commands
 * to interact with the IntakeQ API for appointment scheduling, client management,
 * and intake form handling.
 */

import dotenv from 'dotenv';
import { createBlandServer } from './voice/bland-webhook-server';
import { VoiceConfig } from './voice/interfaces';

// Load environment variables (only if .env file exists)
try {
  dotenv.config();
} catch (error) {
  // Ignore if dotenv fails - environment variables might be set by platform
  console.log('📝 Note: .env file not found - using platform environment variables');
}

// Validate required environment variables
function validateEnvironment(): void {
  const required = ['INTAKEQ_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('');
    console.error('🔧 For Railway deployment:');
    console.error('   1. Go to your Railway project dashboard');
    console.error('   2. Click on "Variables" tab');
    console.error('   3. Add: INTAKEQ_API_KEY = your-api-key');
    console.error('');
    console.error('🔧 For local development:');
    console.error('   1. Copy .env.example to .env');
    console.error('   2. Edit .env and add your INTAKEQ_API_KEY');
    console.error('');
    console.error('🔧 For other platforms:');
    console.error('   Set environment variable: INTAKEQ_API_KEY');
    process.exit(1);
  }
}

// Parse business days from environment
function parseBusinessDays(daysStr?: string): number[] {
  if (!daysStr) return [1, 2, 3, 4, 5]; // Default to Mon-Fri
  
  return daysStr.split(',').map(day => parseInt(day.trim())).filter(day => day >= 0 && day <= 6);
}

// Main server startup function
async function startServer(): Promise<void> {
  try {
    // Validate environment
    validateEnvironment();

    console.log('🚀 Starting IntakeQ Voice Assistant Server...');
    
    // Extract configuration from environment
    const voiceConfig: Partial<VoiceConfig> = {
      defaultPractitionerEmail: process.env.DEFAULT_PRACTITIONER_EMAIL,
      defaultServiceId: process.env.DEFAULT_SERVICE_ID,
      defaultLocationId: process.env.DEFAULT_LOCATION_ID ? parseInt(process.env.DEFAULT_LOCATION_ID) : undefined,
      transferNumber: process.env.TRANSFER_PHONE_NUMBER,
      businessHours: {
        start: process.env.BUSINESS_HOURS_START || '09:00',
        end: process.env.BUSINESS_HOURS_END || '17:00',
        days: parseBusinessDays(process.env.BUSINESS_DAYS)
      }
    };

    // Create and start the server
    const server = createBlandServer(process.env.INTAKEQ_API_KEY!, voiceConfig);
    
    const port = parseInt(process.env.PORT || '3000');
    await server.start(port);

    console.log('✅ Server started successfully!');
    console.log('');
    console.log('📋 Configuration:');
    console.log(`   • Port: ${port}`);
    console.log(`   • Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   • Business Hours: ${voiceConfig.businessHours?.start} - ${voiceConfig.businessHours?.end}`);
    console.log(`   • Business Days: ${voiceConfig.businessHours?.days?.join(', ')}`);
    console.log(`   • Default Practitioner: ${voiceConfig.defaultPractitionerEmail || 'Not set'}`);
    console.log(`   • Transfer Number: ${voiceConfig.transferNumber || 'Not set'}`);
    console.log('');
    console.log('🔗 For Bland.ai configuration, use this webhook URL:');
    
    if (process.env.NODE_ENV === 'production') {
      console.log(`   https://your-domain.com/bland-webhook`);
    } else {
      console.log(`   http://localhost:${port}/bland-webhook`);
      console.log('');
      console.log('⚠️  For production deployment:');
      console.log('   1. Deploy this server to a cloud provider (Railway, Vercel, Heroku, etc.)');
      console.log('   2. Update your Bland.ai webhook URL to point to your production domain');
      console.log('   3. Set NODE_ENV=production in your environment variables');
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

export { startServer };