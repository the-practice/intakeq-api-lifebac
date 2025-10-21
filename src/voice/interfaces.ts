export interface VoiceResponse {
  /** The message the AI should speak back to the caller */
  message: string;
  /** Whether to end the call after this response */
  endCall?: boolean;
  /** Phone number to transfer the call to */
  transferNumber?: string;
  /** Structured data for logging and debugging */
  data?: any;
  /** Whether the operation was successful */
  success?: boolean;
}

export interface CommandIntent {
  /** The primary action to perform */
  action: 
    | 'SCHEDULE_APPOINTMENT'
    | 'CANCEL_APPOINTMENT'
    | 'RESCHEDULE_APPOINTMENT'
    | 'FIND_CLIENT'
    | 'CHECK_APPOINTMENTS'
    | 'SEND_INTAKE_FORM'
    | 'CHECK_INTAKE_STATUS'
    | 'GET_CLIENT_INFO'
    | 'UPDATE_CLIENT_INFO'
    | 'CHECK_AVAILABILITY'
    | 'UNKNOWN';
  /** Extracted parameters from the voice command */
  params: {
    clientName?: string;
    clientEmail?: string;
    practitionerName?: string;
    appointmentId?: string;
    dateTime?: string;
    date?: string;
    time?: string;
    serviceName?: string;
    phoneNumber?: string;
    [key: string]: any;
  };
  /** Confidence score of the intent recognition (0-1) */
  confidence: number;
}

export interface BlandWebhookRequest {
  /** The transcript of what the caller said */
  transcript: string;
  /** Unique identifier for this call */
  call_id: string;
  /** Phone number of the caller */
  from?: string;
  /** Phone number called */
  to?: string;
  /** Additional call metadata */
  metadata?: any;
}

export interface BlandWebhookResponse {
  /** The message for the AI to speak */
  message: string;
  /** Whether to end the call */
  end_call?: boolean;
  /** Phone number to transfer to */
  transfer_number?: string;
  /** Additional data to log */
  data?: any;
}

export interface AppointmentSlot {
  /** Date and time of the slot */
  dateTime: Date;
  /** Duration in minutes */
  duration: number;
  /** Whether the slot is available */
  available: boolean;
  /** Practitioner ID for this slot */
  practitionerId: string;
  /** Service ID for this slot */
  serviceId?: string;
}

export interface ClientSearchResult {
  /** Whether a client was found */
  found: boolean;
  /** Client information if found */
  client?: {
    id: number;
    name: string;
    email: string;
    phone: string;
    lastAppointment?: Date;
    nextAppointment?: Date;
  };
  /** Multiple matches if found */
  matches?: Array<{
    id: number;
    name: string;
    email: string;
    phone: string;
  }>;
}

export interface VoiceConfig {
  /** Default practitioner email for appointments */
  defaultPractitionerEmail?: string;
  /** Default service ID for appointments */
  defaultServiceId?: string;
  /** Default location ID for appointments */
  defaultLocationId?: number;
  /** Business hours for availability checking */
  businessHours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
    days: number[]; // [1,2,3,4,5] for Mon-Fri
  };
  /** Phone number for transfers */
  transferNumber?: string;
}