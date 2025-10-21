import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { IntakeQApi } from '../index';
import { VoiceAssistantApi } from './voice-assistant-api';
import { CommandProcessor } from './command-processor';
import { 
  BlandWebhookRequest, 
  BlandWebhookResponse, 
  VoiceConfig 
} from './interfaces';

export class BlandWebhookServer {
  private app: express.Application;
  private intakeQApi: IntakeQApi;
  private voiceApi: VoiceAssistantApi;
  private commandProcessor: CommandProcessor;
  private config: VoiceConfig;

  constructor(
    intakeQApiKey: string, 
    voiceConfig: Partial<VoiceConfig> = {},
    port: number = 3000
  ) {
    this.app = express();
    this.config = {
      businessHours: {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5]
      },
      ...voiceConfig
    };

    // Initialize APIs
    this.intakeQApi = new IntakeQApi(intakeQApiKey);
    this.voiceApi = new VoiceAssistantApi(this.intakeQApi, this.config);
    this.commandProcessor = new CommandProcessor(this.voiceApi);

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: [
        'https://api.bland.ai',
        'https://bland.ai',
        /\.bland\.ai$/
      ],
      methods: ['POST', 'GET'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
        body: req.body,
        headers: req.headers
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Main Bland.ai webhook endpoint
    this.app.post('/bland-webhook', async (req, res) => {
      try {
        await this.handleBlandWebhook(req, res);
      } catch (error) {
        console.error('Error handling Bland webhook:', error);
        res.status(500).json({
          message: "I'm experiencing technical difficulties. Let me transfer you to someone who can help.",
          end_call: false,
          transfer_number: this.config.transferNumber || undefined
        });
      }
    });

    // Test endpoint for development
    this.app.post('/test-command', async (req, res) => {
      try {
        const { transcript } = req.body;
        
        if (!transcript) {
          return res.status(400).json({ error: 'Missing transcript' });
        }

        const response = await this.commandProcessor.processCommand(transcript);
        
        res.json({
          transcript,
          response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error testing command:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Configuration endpoint
    this.app.get('/config', (req, res) => {
      res.json({
        businessHours: this.config.businessHours,
        hasTransferNumber: !!this.config.transferNumber,
        hasDefaultPractitioner: !!this.config.defaultPractitionerEmail,
        hasDefaultService: !!this.config.defaultServiceId
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  private async handleBlandWebhook(req: express.Request, res: express.Response): Promise<void> {
    const webhookData: BlandWebhookRequest = req.body;
    
    // Log the incoming request
    console.log('Received Bland webhook:', {
      call_id: webhookData.call_id,
      transcript: webhookData.transcript,
      from: webhookData.from,
      to: webhookData.to
    });

    // Validate required fields
    if (!webhookData.transcript) {
      console.error('Missing transcript in webhook request');
      res.status(400).json({
        message: "I didn't catch that. Could you please repeat what you need help with?",
        end_call: false
      });
      return;
    }

    if (!webhookData.call_id) {
      console.error('Missing call_id in webhook request');
      res.status(400).json({
        message: "I'm experiencing technical difficulties. Please try calling again.",
        end_call: true
      });
      return;
    }

    try {
      // Process the voice command
      const voiceResponse = await this.commandProcessor.processCommand(webhookData.transcript);

      // Convert to Bland webhook response format
      const blandResponse: BlandWebhookResponse = {
        message: voiceResponse.message,
        end_call: voiceResponse.endCall || false,
        transfer_number: voiceResponse.transferNumber,
        data: {
          success: voiceResponse.success,
          call_id: webhookData.call_id,
          original_transcript: webhookData.transcript,
          response_data: voiceResponse.data,
          timestamp: new Date().toISOString()
        }
      };

      // Log the response
      console.log('Sending Bland response:', {
        call_id: webhookData.call_id,
        success: voiceResponse.success,
        message_length: blandResponse.message.length,
        end_call: blandResponse.end_call,
        has_transfer: !!blandResponse.transfer_number
      });

      res.json(blandResponse);

    } catch (error) {
      console.error('Error processing voice command:', {
        call_id: webhookData.call_id,
        transcript: webhookData.transcript,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Send error response
      const errorResponse: BlandWebhookResponse = {
        message: "I'm sorry, I'm having trouble processing your request right now. Let me transfer you to someone who can help.",
        end_call: false,
        transfer_number: this.config.transferNumber,
        data: {
          success: false,
          call_id: webhookData.call_id,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Start the webhook server
   */
  public start(port?: number): Promise<void> {
    const serverPort = port || process.env.PORT || 3000;
    
    return new Promise((resolve, reject) => {
      try {
        this.app.listen(serverPort, () => {
          console.log(`🚀 Bland.ai Webhook Server running on port ${serverPort}`);
          console.log(`📋 Health check: http://localhost:${serverPort}/health`);
          console.log(`🔗 Webhook URL: http://localhost:${serverPort}/bland-webhook`);
          console.log(`🧪 Test endpoint: http://localhost:${serverPort}/test-command`);
          console.log(`⚙️  Config endpoint: http://localhost:${serverPort}/config`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get the Express app instance (useful for testing)
   */
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * Update voice configuration
   */
  public updateConfig(newConfig: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.voiceApi = new VoiceAssistantApi(this.intakeQApi, this.config);
    this.commandProcessor = new CommandProcessor(this.voiceApi);
  }
}

// Factory function for easy server creation
export function createBlandServer(
  intakeQApiKey: string,
  voiceConfig?: Partial<VoiceConfig>
): BlandWebhookServer {
  return new BlandWebhookServer(intakeQApiKey, voiceConfig);
}

// Export for direct usage
export { VoiceConfig, VoiceAssistantApi, CommandProcessor };