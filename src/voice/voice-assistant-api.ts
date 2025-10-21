import { IntakeQApi } from '../index';
import { 
  VoiceResponse, 
  ClientSearchResult, 
  AppointmentSlot, 
  VoiceConfig 
} from './interfaces';
import { 
  Client, 
  ClientWithProfile, 
  Appointment, 
  CreateAppointmentRequest,
  AppointmentStatus 
} from '../appointment/interfaces';

export class VoiceAssistantApi {
  private config: VoiceConfig;

  constructor(
    private intakeQApi: IntakeQApi, 
    config: Partial<VoiceConfig> = {}
  ) {
    this.config = {
      businessHours: {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5] // Mon-Fri
      },
      ...config
    };
  }

  /**
   * Find a client by name with voice-friendly response
   */
  async findClientByName(name: string): Promise<VoiceResponse> {
    try {
      const clients = await this.intakeQApi.Client.listClients(
        { search: name },
        true
      );

      if (clients.length === 0) {
        return {
          message: `I couldn't find any clients named ${name}. Could you please spell the name or provide their email address?`,
          success: false
        };
      }

      if (clients.length === 1) {
        const client = clients[0] as ClientWithProfile;
        const nextAppointment = await this.getNextClientAppointment(client.ClientId);
        
        let message = `Found ${client.Name}. Their email is ${client.Email}`;
        if (client.Phone) {
          message += ` and phone number is ${this.formatPhoneForSpeech(client.Phone)}`;
        }
        if (nextAppointment) {
          message += `. Their next appointment is ${this.formatDateForSpeech(nextAppointment.StartDateIso)}`;
        }

        return {
          message,
          success: true,
          data: { client, nextAppointment }
        };
      }

      // Multiple matches
      const names = clients.slice(0, 3).map(c => c.Name).join(', ');
      return {
        message: `I found ${clients.length} clients with that name: ${names}. Could you be more specific or provide their email address?`,
        success: false,
        data: { matches: clients }
      };

    } catch (error) {
      return {
        message: "I'm sorry, I encountered an error while searching for that client. Please try again.",
        success: false
      };
    }
  }

  /**
   * Find a client by email address
   */
  async findClientByEmail(email: string): Promise<VoiceResponse> {
    try {
      const client = await this.intakeQApi.Client.getClientByEmail(email);
      
      if (!client) {
        return {
          message: `I couldn't find a client with email ${email}. Would you like me to create a new client record?`,
          success: false
        };
      }

      const nextAppointment = await this.getNextClientAppointment(client.ClientId);
      let message = `Found ${client.Name} with email ${email}`;
      
      if (nextAppointment) {
        message += `. Their next appointment is ${this.formatDateForSpeech(nextAppointment.StartDateIso)}`;
      }

      return {
        message,
        success: true,
        data: { client, nextAppointment }
      };

    } catch (error) {
      return {
        message: `I couldn't find a client with email ${email}. Would you like me to create a new client record?`,
        success: false
      };
    }
  }

  /**
   * Schedule a new appointment
   */
  async scheduleAppointment(
    clientName: string,
    dateTimeStr: string,
    serviceName?: string,
    practitionerEmail?: string
  ): Promise<VoiceResponse> {
    try {
      // Find the client first
      const clients = await this.intakeQApi.Client.listClients({ search: clientName }, true);
      
      if (clients.length === 0) {
        return {
          message: `I couldn't find a client named ${clientName}. Would you like me to create a new client record first?`,
          success: false
        };
      }

      if (clients.length > 1) {
        const names = clients.slice(0, 3).map(c => c.Name).join(', ');
        return {
          message: `I found multiple clients: ${names}. Could you be more specific or provide their email?`,
          success: false
        };
      }

      const client = clients[0] as ClientWithProfile;
      
      // Parse the date/time
      const appointmentDate = this.parseDateTime(dateTimeStr);
      if (!appointmentDate) {
        return {
          message: "I couldn't understand that date and time. Could you please say it in a format like 'tomorrow at 3 PM' or 'December 15th at 10:30 AM'?",
          success: false
        };
      }

      // Check if the time is in business hours
      if (!this.isBusinessHours(appointmentDate)) {
        return {
          message: `That time is outside our business hours. We're open ${this.getBusinessHoursText()}. Please choose a different time.`,
          success: false
        };
      }

      // Get settings to find available practitioners and services
      const settings = await this.intakeQApi.Appointment.getSettings();
      
      // Find practitioner
      const practitioner = practitionerEmail 
        ? settings.Practitioners.find(p => p.Email === practitionerEmail)
        : this.config.defaultPractitionerEmail 
          ? settings.Practitioners.find(p => p.Email === this.config.defaultPractitionerEmail)
          : settings.Practitioners[0];

      if (!practitioner) {
        return {
          message: "I couldn't find an available practitioner. Please contact our office directly.",
          success: false,
          transferNumber: this.config.transferNumber
        };
      }

      // Find service
      const service = serviceName
        ? settings.Services.find(s => s.Name.toLowerCase().includes(serviceName.toLowerCase()))
        : this.config.defaultServiceId
          ? settings.Services.find(s => s.Id === this.config.defaultServiceId)
          : settings.Services[0];

      if (!service) {
        return {
          message: "I couldn't find that service. Let me transfer you to someone who can help schedule that appointment.",
          success: false,
          transferNumber: this.config.transferNumber
        };
      }

      // Create the appointment
      const appointmentRequest: CreateAppointmentRequest = {
        ClientId: client.ClientId,
        PractitionerId: practitioner.Id,
        ServiceId: service.Id,
        LocationId: this.config.defaultLocationId || settings.Locations[0]?.Id || 1,
        UtcDateTime: Math.floor(appointmentDate.getTime() / 1000),
        Status: 'WaitingConfirmation',
        SendClientEmailNotification: true,
        ReminderType: 'Email'
      };

      const appointment = await this.intakeQApi.Appointment.create(appointmentRequest);

      return {
        message: `Great! I've scheduled ${client.Name} for ${service.Name} with ${practitioner.CompleteName} on ${this.formatDateForSpeech(appointment.StartDateIso)}. A confirmation email will be sent to ${client.Email}.`,
        success: true,
        data: { appointment, client, practitioner, service }
      };

    } catch (error) {
      return {
        message: "I'm sorry, I couldn't schedule that appointment. Let me transfer you to someone who can help.",
        success: false,
        transferNumber: this.config.transferNumber
      };
    }
  }

  /**
   * Get upcoming appointments for today or a specific date
   */
  async getUpcomingAppointments(date?: string): Promise<VoiceResponse> {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0];

      const appointments = await this.intakeQApi.Appointment.list({
        startDate: dateStr,
        endDate: dateStr,
        status: 'Confirmed'
      });

      if (appointments.length === 0) {
        const dayText = date ? this.formatDateForSpeech(dateStr) : 'today';
        return {
          message: `There are no confirmed appointments scheduled for ${dayText}.`,
          success: true,
          data: { appointments: [] }
        };
      }

      const appointmentText = appointments
        .sort((a, b) => a.StartDate - b.StartDate)
        .slice(0, 5) // Limit to first 5 for voice
        .map(apt => {
          const time = this.formatTimeForSpeech(apt.StartDateIso);
          return `${time} - ${apt.ClientName} with ${apt.PractitionerName}`;
        })
        .join(', ');

      const dayText = date ? this.formatDateForSpeech(dateStr) : 'today';
      return {
        message: `Here are the confirmed appointments for ${dayText}: ${appointmentText}`,
        success: true,
        data: { appointments }
      };

    } catch (error) {
      return {
        message: "I'm sorry, I couldn't retrieve the appointment schedule right now. Please try again.",
        success: false
      };
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId: string, reason?: string): Promise<VoiceResponse> {
    try {
      const appointment = await this.intakeQApi.Appointment.get(appointmentId);
      
      if (!appointment) {
        return {
          message: "I couldn't find that appointment. Could you provide the appointment ID or client name?",
          success: false
        };
      }

      await this.intakeQApi.Appointment.cancel(appointmentId, reason);

      return {
        message: `I've canceled the appointment for ${appointment.ClientName} on ${this.formatDateForSpeech(appointment.StartDateIso)}. The client will be notified.`,
        success: true,
        data: { appointment }
      };

    } catch (error) {
      return {
        message: "I'm sorry, I couldn't cancel that appointment. Please try again or contact our office directly.",
        success: false,
        transferNumber: this.config.transferNumber
      };
    }
  }

  /**
   * Send intake forms to a client
   */
  async sendIntakeForm(clientEmail: string, questionnaireName?: string): Promise<VoiceResponse> {
    try {
      const client = await this.intakeQApi.Client.getClientByEmail(clientEmail);
      
      if (!client) {
        return {
          message: `I couldn't find a client with email ${clientEmail}. Please check the email address.`,
          success: false
        };
      }

      // Get available questionnaires
      const questionnaires = await this.intakeQApi.Questionnaire.listQuestionnaireTemplates();
      
      if (questionnaires.length === 0) {
        return {
          message: "There are no intake forms available to send. Please contact our office.",
          success: false,
          transferNumber: this.config.transferNumber
        };
      }

      // Find the questionnaire
      const questionnaire = questionnaireName
        ? questionnaires.find(q => q.Name.toLowerCase().includes(questionnaireName.toLowerCase()))
        : questionnaires[0];

      if (!questionnaire) {
        const availableNames = questionnaires.slice(0, 3).map(q => q.Name).join(', ');
        return {
          message: `I couldn't find that intake form. Available forms include: ${availableNames}`,
          success: false
        };
      }

      // Get practitioners
      const practitioners = await this.intakeQApi.Questionnaire.listPractitioners();
      const practitioner = this.config.defaultPractitionerEmail
        ? practitioners.find(p => p.Email === this.config.defaultPractitionerEmail)
        : practitioners[0];

      if (!practitioner) {
        return {
          message: "I couldn't find an available practitioner. Please contact our office.",
          success: false,
          transferNumber: this.config.transferNumber
        };
      }

      // Send the questionnaire
      const intake = await this.intakeQApi.Questionnaire.sendQuestionnaire({
        ClientId: client.ClientId,
        QuestionnaireId: questionnaire.Id,
        PractitionerId: practitioner.Id
      });

      return {
        message: `I've sent the ${questionnaire.Name} intake form to ${client.Name} at ${clientEmail}. They'll receive an email with instructions to complete it.`,
        success: true,
        data: { intake, client, questionnaire }
      };

    } catch (error) {
      return {
        message: "I'm sorry, I couldn't send the intake form. Please try again or contact our office.",
        success: false,
        transferNumber: this.config.transferNumber
      };
    }
  }

  // Helper methods

  private async getNextClientAppointment(clientId: number): Promise<Appointment | null> {
    try {
      const appointments = await this.intakeQApi.Appointment.list({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Next 30 days
      });

      const clientAppointments = appointments
        .filter(apt => apt.ClientId === clientId && apt.Status === 'Confirmed')
        .sort((a, b) => a.StartDate - b.StartDate);

      return clientAppointments[0] || null;
    } catch {
      return null;
    }
  }

  private parseDateTime(dateTimeStr: string): Date | null {
    // Simple date/time parsing - in production, use a library like chrono-node
    const now = new Date();
    const str = dateTimeStr.toLowerCase();

    // Handle "tomorrow"
    if (str.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const time = this.extractTime(str);
      if (time) {
        tomorrow.setHours(time.hours, time.minutes, 0, 0);
        return tomorrow;
      }
    }

    // Handle "today"
    if (str.includes('today')) {
      const today = new Date(now);
      const time = this.extractTime(str);
      if (time) {
        today.setHours(time.hours, time.minutes, 0, 0);
        return today;
      }
    }

    // Try to parse as a regular date
    try {
      const parsed = new Date(dateTimeStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      // Ignore parsing errors
    }

    return null;
  }

  private extractTime(str: string): { hours: number; minutes: number } | null {
    // Extract time patterns like "3 PM", "10:30 AM", "15:30"
    const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
    const match = str.match(timeRegex);

    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || '0');
      const ampm = match[3]?.toLowerCase();

      if (ampm) {
        if (ampm === 'pm' && hours !== 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
      }

      return { hours, minutes };
    }

    return null;
  }

  private isBusinessHours(date: Date): boolean {
    const day = date.getDay();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    const [startHour, startMin] = this.config.businessHours!.start.split(':').map(Number);
    const [endHour, endMin] = this.config.businessHours!.end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    return (
      this.config.businessHours!.days.includes(day) &&
      timeInMinutes >= startTime &&
      timeInMinutes < endTime
    );
  }

  private getBusinessHoursText(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNames = this.config.businessHours!.days.map(d => days[d]).join(' through ');
    return `${dayNames} from ${this.config.businessHours!.start} to ${this.config.businessHours!.end}`;
  }

  private formatPhoneForSpeech(phone: string): string {
    // Format phone number for speech (e.g., "555-123-4567" -> "5 5 5, 1 2 3, 4 5 6 7")
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.substr(0, 3).split('').join(' ')}, ${cleaned.substr(3, 3).split('').join(' ')}, ${cleaned.substr(6, 4).split('').join(' ')}`;
    }
    return phone.split('').join(' ');
  }

  private formatDateForSpeech(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private formatTimeForSpeech(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}