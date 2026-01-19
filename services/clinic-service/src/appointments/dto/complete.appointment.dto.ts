import { IsString, IsOptional, IsInt, Min, IsUrl } from 'class-validator';

export class CompleteAppointmentDto {
  @IsString()
  notes: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;
}
