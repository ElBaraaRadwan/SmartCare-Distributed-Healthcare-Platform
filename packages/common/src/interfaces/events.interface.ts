export interface IEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  data: any;
}

export interface IAppointmentBookedEvent {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
}

export interface IPrescriptionCreatedEvent {
  prescriptionId: string;
  doctorId: string;
  patientId: string;
  medications: Array<{
    name: string;
    dosage: string;
    quantity: number;
  }>;
}
