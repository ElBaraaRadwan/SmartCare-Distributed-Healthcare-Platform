import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreatePrescriptionOcrDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsOptional()
  @IsString()
  ocrText?: string;
}
