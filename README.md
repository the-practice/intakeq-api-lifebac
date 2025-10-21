# IntakeQ API with Bland.ai Voice Integration

A comprehensive TypeScript wrapper around the [IntakeQ](https://intakeq.com/) APIs with added support for Bland.ai voice agent integration. This library enables voice-powered appointment scheduling, client management, and intake form handling.

## Features

### Core IntakeQ API
- **Client Management**: Search, create, update clients and manage tags
- **Appointment Management**: List, create, update, cancel appointments  
- **Questionnaire/Intake Forms**: Send forms, retrieve responses
- **Treatment Notes**: Access and manage clinical notes
- **Invoice Management**: View billing and payment information

### Voice Assistant Integration
- **Bland.ai Webhook Server**: Ready-to-deploy server for voice interactions
- **Natural Language Processing**: Interpret voice commands for common tasks
- **Voice-Optimized Responses**: Formatted for speech synthesis
- **Appointment Scheduling**: Voice-powered booking with availability checking
- **Client Lookup**: Find clients by name or email via voice
- **Intake Form Management**: Send forms and check status through voice commands

## Installation

```bash
npm install @lifebac/intakeq
```

## Basic Usage

### Standard IntakeQ API

```typescript
import { IntakeQApi } from '@lifebac/intakeq';

const client = new IntakeQApi('your-api-key');

// List clients
const clients = await client.Client.listClients(
  { search: 'john.smith@example.com' },
  true
);

// Create appointment
const appointment = await client.Appointment.create({
  ClientId: 123,
  PractitionerId: 'practitioner-id',
  ServiceId: 'service-id',
  LocationId: 1,
  UtcDateTime: Math.floor(Date.now() / 1000),
  Status: 'Confirmed',
  SendClientEmailNotification: true,
  ReminderType: 'Email'
});
```

### Voice Assistant Setup

1. **Configure Environment**

Create a `.env` file:

```bash
# Copy the example
cp .env.example .env

# Edit with your values
INTAKEQ_API_KEY=your-intakeq-api-key
DEFAULT_PRACTITIONER_EMAIL=doctor@yourpractice.com
TRANSFER_PHONE_NUMBER=+15551234567
```

2. **Start Voice Server**

```bash
# Development mode
npm run voice-dev

# Production build
npm run voice-build
```

3. **Create Voice Server Programmatically**

```typescript
import { createBlandServer } from '@lifebac/intakeq';

const server = createBlandServer('your-intakeq-api-key', {
  defaultPractitionerEmail: 'doctor@yourpractice.com',
  transferNumber: '+15551234567',
  businessHours: {
    start: '09:00',
    end: '17:00',
    days: [1, 2, 3, 4, 5] // Mon-Fri
  }
});

await server.start(3000);
```

## Voice Commands Supported

The voice assistant can handle these types of requests:

### Appointment Scheduling
- *"Schedule John Smith for tomorrow at 3 PM"*
- *"Book Mary for a consultation next Tuesday at 10 AM"*
- *"Make an appointment for jane.doe@email.com"*

### Client Management
- *"Find client John Smith"*
- *"Look up jane.doe@email.com"*
- *"Search for Mary Johnson"*

### Schedule Checking
- *"What appointments do we have today?"*
- *"Show me tomorrow's schedule"*
- *"Check appointments for Friday"*

### Intake Forms
- *"Send intake form to john@email.com"*
- *"Send new patient forms to Mary"*

### Appointment Cancellation
- *"Cancel appointment for John Smith"*
- *"Delete the 2 PM appointment"*

## Bland.ai Configuration

1. **Deploy Your Server**
   
   Deploy to Railway, Vercel, Heroku, or any cloud platform:
   
   ```bash
   # Build for production
   npm run voice-build
   
   # Deploy the dist/ folder with your platform
   ```

2. **Configure Bland.ai Webhook**
   
   In your Bland.ai dashboard:
   - Set webhook URL to: `https://your-domain.com/bland-webhook`
   - Configure your voice agent's personality and instructions

3. **Test Integration**
   
   Use the test endpoint during development:
   
   ```bash
   curl -X POST http://localhost:3000/test-command \
     -H "Content-Type: application/json" \
     -d '{"transcript": "Schedule John Smith for tomorrow at 3 PM"}'
   ```

## Voice Configuration Options

```typescript
interface VoiceConfig {
  // Default settings for appointments
  defaultPractitionerEmail?: string;
  defaultServiceId?: string;
  defaultLocationId?: number;
  
  // Business hours for availability checking
  businessHours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
    days: number[]; // [1,2,3,4,5] for Mon-Fri
  };
  
  // Phone number for complex requests
  transferNumber?: string;
}
```

## API Reference

### VoiceAssistantApi

```typescript
const voiceApi = new VoiceAssistantApi(intakeQClient, config);

// Find clients
await voiceApi.findClientByName("John Smith");
await voiceApi.findClientByEmail("john@email.com");

// Manage appointments
await voiceApi.scheduleAppointment("John Smith", "tomorrow at 3 PM");
await voiceApi.getUpcomingAppointments();
await voiceApi.cancelAppointment("appointment-id");

// Send intake forms
await voiceApi.sendIntakeForm("client@email.com", "New Patient Form");
```

### CommandProcessor

```typescript
const processor = new CommandProcessor(voiceApi);

const response = await processor.processCommand(
  "Schedule John Smith for tomorrow at 3 PM"
);

console.log(response.message); // What the AI should say
console.log(response.success); // Whether the operation succeeded
```

## Error Handling

The voice assistant includes robust error handling:

- **Client Not Found**: Offers to create new client or asks for more info
- **Invalid Times**: Suggests business hours and alternative times  
- **System Errors**: Gracefully transfers to human support
- **Missing Information**: Prompts for required details

## Development

### Running Tests

```bash
npm test
```

### Development Server

```bash
# Start with auto-reload
npm run voice-dev

# Test specific commands
curl -X POST http://localhost:3000/test-command \
  -H "Content-Type: application/json" \
  -d '{"transcript": "find john smith"}'
```

### Building

```bash
# Build library only
npm run build

# Build voice server
npm run voice-build
```

## Deployment

### Important: NPM Token Issue Fix

If you encounter a Yarn installation error about `${NPM_TOKEN}`, this is because the original `.npmrc` file contained a publish token reference. This has been fixed:

- `.npmrc` now contains only the registry URL (no authentication)
- `.npmrc.publish` contains the publish configuration (used only when publishing)
- Publishing is handled via `npm run publish:npm` script

### Environment Variables

Required:
- `INTAKEQ_API_KEY`: Your IntakeQ API key

Optional:
- `DEFAULT_PRACTITIONER_EMAIL`: Default practitioner for appointments
- `DEFAULT_SERVICE_ID`: Default service type
- `TRANSFER_PHONE_NUMBER`: Phone number for complex requests
- `BUSINESS_HOURS_START`: Start time (e.g., "09:00")
- `BUSINESS_HOURS_END`: End time (e.g., "17:00")  
- `BUSINESS_DAYS`: Days of week (e.g., "1,2,3,4,5")

### Docker Deployment

```bash
# Build the Docker image
docker build -t intakeq-voice .

# Run the container
docker run -p 3000:3000 \
  -e INTAKEQ_API_KEY=your-api-key \
  -e DEFAULT_PRACTITIONER_EMAIL=doctor@yourpractice.com \
  intakeq-voice
```

### Railway Deployment

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically use the `railway.json` configuration
4. Deploy automatically on push to main branch

### Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Configure environment variables in Vercel dashboard

### Manual Build and Deploy

```bash
# Install dependencies (no NPM_TOKEN needed)
yarn install

# Build the project
npm run build

# Start the server
npm run voice-server
```

## Support

- **Documentation**: [IntakeQ API Docs](https://developers.intakeq.com/)
- **Issues**: [GitHub Issues](https://github.com/LifeBac/intakeq-api/issues)
- **Email**: developer@lifebac.com

## License

ISC License - see LICENSE file for details.
