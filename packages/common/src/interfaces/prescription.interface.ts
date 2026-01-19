export enum PrescriptionStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

export interface IMedication {
  id?: string;
  name: string;
  dosage: string;
  quantity: number;
  instructions?: string;
}

export interface IPrescription {
  id: string;
  doctorId: string;
  patientId: string;
  consultationId?: string;
  ocrText?: string;
  status: PrescriptionStatus;
  medications: IMedication[];
  createdAt?: Date;
  updatedAt?: Date;
}
