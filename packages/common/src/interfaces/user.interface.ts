export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  PHARMACIST = 'PHARMACIST',
  ADMIN = 'ADMIN',
}

export interface IUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}
