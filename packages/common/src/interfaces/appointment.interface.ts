export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IConsultation {
  id: string;
  appointmentId: string;
  notes: string;
  duration?: number;
  videoUrl?: string;
  createdAt?: Date;
}
