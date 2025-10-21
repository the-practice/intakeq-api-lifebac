import { CommandIntent, VoiceResponse } from './interfaces';
import { VoiceAssistantApi } from './voice-assistant-api';

export class CommandProcessor {
  constructor(private voiceApi: VoiceAssistantApi) {}

  /**
   * Process a voice command transcript and return appropriate response
   */
  async processCommand(transcript: string): Promise<VoiceResponse> {
    const intent = this.extractIntent(transcript);

    switch (intent.action) {
      case 'SCHEDULE_APPOINTMENT':
        return this.handleScheduleAppointment(intent);
      
      case 'CANCEL_APPOINTMENT':
        return this.handleCancelAppointment(intent);
      
      case 'RESCHEDULE_APPOINTMENT':
        return this.handleRescheduleAppointment(intent);
      
      case 'FIND_CLIENT':
        return this.handleFindClient(intent);
      
      case 'CHECK_APPOINTMENTS':
        return this.handleCheckAppointments(intent);
      
      case 'SEND_INTAKE_FORM':
        return this.handleSendIntakeForm(intent);
      
      case 'CHECK_INTAKE_STATUS':
        return this.handleCheckIntakeStatus(intent);
      
      case 'GET_CLIENT_INFO':
        return this.handleGetClientInfo(intent);
      
      case 'CHECK_AVAILABILITY':
        return this.handleCheckAvailability(intent);
      
      default:
        return this.handleUnknownCommand(transcript);
    }
  }

  /**
   * Extract intent and parameters from voice transcript
   */
  private extractIntent(transcript: string): CommandIntent {
    const text = transcript.toLowerCase().trim();
    
    // Schedule appointment patterns
    if (this.matchesPatterns(text, [
      'schedule', 'book', 'make an appointment', 'set up', 'arrange'
    ])) {
      return {
        action: 'SCHEDULE_APPOINTMENT',
        params: this.extractScheduleParams(text),
        confidence: this.calculateConfidence(text, ['schedule', 'appointment'])
      };
    }

    // Cancel appointment patterns
    if (this.matchesPatterns(text, [
      'cancel', 'delete', 'remove', 'cancel appointment'
    ])) {
      return {
        action: 'CANCEL_APPOINTMENT',
        params: this.extractCancelParams(text),
        confidence: this.calculateConfidence(text, ['cancel'])
      };
    }

    // Reschedule appointment patterns
    if (this.matchesPatterns(text, [
      'reschedule', 'move', 'change', 'reschedule appointment'
    ])) {
      return {
        action: 'RESCHEDULE_APPOINTMENT',
        params: this.extractRescheduleParams(text),
        confidence: this.calculateConfidence(text, ['reschedule', 'move'])
      };
    }

    // Find client patterns
    if (this.matchesPatterns(text, [
      'find', 'look up', 'search for', 'find client', 'look for'
    ])) {
      return {
        action: 'FIND_CLIENT',
        params: this.extractClientParams(text),
        confidence: this.calculateConfidence(text, ['find', 'client'])
      };
    }

    // Check appointments patterns
    if (this.matchesPatterns(text, [
      'check appointments', 'show appointments', 'list appointments',
      'what appointments', 'appointments today', 'schedule for'
    ])) {
      return {
        action: 'CHECK_APPOINTMENTS',
        params: this.extractDateParams(text),
        confidence: this.calculateConfidence(text, ['appointments', 'schedule'])
      };
    }

    // Send intake form patterns
    if (this.matchesPatterns(text, [
      'send form', 'intake form', 'send intake', 'questionnaire'
    ])) {
      return {
        action: 'SEND_INTAKE_FORM',
        params: this.extractIntakeParams(text),
        confidence: this.calculateConfidence(text, ['intake', 'form'])
      };
    }

    // Check intake status patterns
    if (this.matchesPatterns(text, [
      'check intake', 'intake status', 'form status', 'completed form'
    ])) {
      return {
        action: 'CHECK_INTAKE_STATUS',
        params: this.extractClientParams(text),
        confidence: this.calculateConfidence(text, ['intake', 'status'])
      };
    }

    // Get client info patterns
    if (this.matchesPatterns(text, [
      'client info', 'client information', 'tell me about', 'client details'
    ])) {
      return {
        action: 'GET_CLIENT_INFO',
        params: this.extractClientParams(text),
        confidence: this.calculateConfidence(text, ['client', 'info'])
      };
    }

    // Check availability patterns
    if (this.matchesPatterns(text, [
      'available', 'availability', 'free time', 'open slots'
    ])) {
      return {
        action: 'CHECK_AVAILABILITY',
        params: this.extractAvailabilityParams(text),
        confidence: this.calculateConfidence(text, ['available'])
      };
    }

    return {
      action: 'UNKNOWN',
      params: {},
      confidence: 0
    };
  }

  // Intent handlers

  private async handleScheduleAppointment(intent: CommandIntent): Promise<VoiceResponse> {
    const { clientName, dateTime, serviceName, practitionerName } = intent.params;

    if (!clientName) {
      return {
        message: "I'd be happy to schedule an appointment. What's the client's name?",
        success: false
      };
    }

    if (!dateTime) {
      return {
        message: `When would you like to schedule the appointment for ${clientName}?`,
        success: false
      };
    }

    return this.voiceApi.scheduleAppointment(clientName, dateTime, serviceName, practitionerName);
  }

  private async handleCancelAppointment(intent: CommandIntent): Promise<VoiceResponse> {
    const { clientName, appointmentId, dateTime } = intent.params;

    if (appointmentId) {
      return this.voiceApi.cancelAppointment(appointmentId);
    }

    if (!clientName && !dateTime) {
      return {
        message: "Which appointment would you like to cancel? Please provide the client name or appointment details.",
        success: false
      };
    }

    // For now, ask for more specific information
    return {
      message: "I need more specific information to cancel that appointment. Could you provide the appointment ID or have someone transfer you to our scheduling team?",
      success: false
    };
  }

  private async handleRescheduleAppointment(intent: CommandIntent): Promise<VoiceResponse> {
    return {
      message: "I can help you reschedule an appointment. Let me transfer you to our scheduling team who can find the best available time.",
      success: false
    };
  }

  private async handleFindClient(intent: CommandIntent): Promise<VoiceResponse> {
    const { clientName, clientEmail } = intent.params;

    if (clientEmail) {
      return this.voiceApi.findClientByEmail(clientEmail);
    }

    if (clientName) {
      return this.voiceApi.findClientByName(clientName);
    }

    return {
      message: "I'd be happy to find a client for you. What's their name or email address?",
      success: false
    };
  }

  private async handleCheckAppointments(intent: CommandIntent): Promise<VoiceResponse> {
    const { date } = intent.params;
    return this.voiceApi.getUpcomingAppointments(date);
  }

  private async handleSendIntakeForm(intent: CommandIntent): Promise<VoiceResponse> {
    const { clientEmail, serviceName } = intent.params;

    if (!clientEmail) {
      return {
        message: "I'd be happy to send an intake form. What's the client's email address?",
        success: false
      };
    }

    return this.voiceApi.sendIntakeForm(clientEmail, serviceName);
  }

  private async handleCheckIntakeStatus(intent: CommandIntent): Promise<VoiceResponse> {
    return {
      message: "I can help you check intake form status. Let me transfer you to someone who can look that up for you.",
      success: false
    };
  }

  private async handleGetClientInfo(intent: CommandIntent): Promise<VoiceResponse> {
    const { clientName, clientEmail } = intent.params;

    if (clientEmail) {
      return this.voiceApi.findClientByEmail(clientEmail);
    }

    if (clientName) {
      return this.voiceApi.findClientByName(clientName);
    }

    return {
      message: "Which client would you like information about? Please provide their name or email address.",
      success: false
    };
  }

  private async handleCheckAvailability(intent: CommandIntent): Promise<VoiceResponse> {
    return {
      message: "I can help you check availability. Let me transfer you to our scheduling team who can see all available time slots.",
      success: false
    };
  }

  private async handleUnknownCommand(transcript: string): Promise<VoiceResponse> {
    // Check if it seems like a greeting
    if (this.matchesPatterns(transcript.toLowerCase(), [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon'
    ])) {
      return {
        message: "Hello! I'm here to help with scheduling appointments, finding client information, and sending intake forms. How can I assist you today?",
        success: true
      };
    }

    // Check if they're asking for help
    if (this.matchesPatterns(transcript.toLowerCase(), [
      'help', 'what can you do', 'how do you work'
    ])) {
      return {
        message: "I can help you schedule appointments, find client information, check today's schedule, send intake forms, and cancel appointments. What would you like to do?",
        success: true
      };
    }

    return {
      message: "I'm not sure how to help with that. I can schedule appointments, find clients, check schedules, or send intake forms. What would you like me to do?",
      success: false
    };
  }

  // Parameter extraction methods

  private extractScheduleParams(text: string): any {
    const params: any = {};

    // Extract client name - look for patterns like "for John Smith", "schedule Mary"
    const namePatterns = [
      /(?:for|schedule|book)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*?)(?:\s+(?:at|on|for|tomorrow|today))/i,
      /schedule\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/i
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        params.clientName = match[1].trim();
        break;
      }
    }

    // Extract date/time
    params.dateTime = this.extractDateTime(text);

    // Extract service name
    const serviceMatch = text.match(/(?:for|appointment for)\s+([^at|on]+?)(?:\s+(?:at|on|with))/i);
    if (serviceMatch) {
      params.serviceName = serviceMatch[1].trim();
    }

    return params;
  }

  private extractCancelParams(text: string): any {
    const params: any = {};

    // Extract client name
    const nameMatch = text.match(/(?:cancel|delete)\s+(?:appointment\s+)?(?:for\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
    if (nameMatch) {
      params.clientName = nameMatch[1].trim();
    }

    // Extract appointment ID if mentioned
    const idMatch = text.match(/appointment\s+(?:id\s+)?([A-Za-z0-9-]+)/i);
    if (idMatch) {
      params.appointmentId = idMatch[1];
    }

    return params;
  }

  private extractRescheduleParams(text: string): any {
    // Similar to cancel params
    return this.extractCancelParams(text);
  }

  private extractClientParams(text: string): any {
    const params: any = {};

    // Extract client name
    const namePatterns = [
      /(?:find|look up|search for|client)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/i,
      /([A-Za-z]+(?:\s+[A-Za-z]+)*?)(?:\s+client)/i
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        params.clientName = match[1].trim();
        break;
      }
    }

    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      params.clientEmail = emailMatch[1];
    }

    return params;
  }

  private extractDateParams(text: string): any {
    const params: any = {};
    params.date = this.extractDateTime(text);
    return params;
  }

  private extractIntakeParams(text: string): any {
    const params: any = {};

    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      params.clientEmail = emailMatch[1];
    }

    // Extract form type
    const formMatch = text.match(/(?:intake|form|questionnaire)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
    if (formMatch) {
      params.serviceName = formMatch[1].trim();
    }

    return params;
  }

  private extractAvailabilityParams(text: string): any {
    const params: any = {};
    params.date = this.extractDateTime(text);
    return params;
  }

  // Helper methods

  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  private calculateConfidence(text: string, keywords: string[]): number {
    const matches = keywords.filter(keyword => text.includes(keyword)).length;
    return Math.min(matches / keywords.length, 1.0);
  }

  private extractDateTime(text: string): string | undefined {
    // Extract common date/time patterns
    const patterns = [
      /today/i,
      /tomorrow/i,
      /(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
      /(?:on\s+)?(\w+day)/i,
      /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/,
      /(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }
}