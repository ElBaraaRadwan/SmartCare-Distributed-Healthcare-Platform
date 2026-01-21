import { IsDateString, IsOptional } from 'class-validator';

export class ConfirmOrderDto {
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;
}