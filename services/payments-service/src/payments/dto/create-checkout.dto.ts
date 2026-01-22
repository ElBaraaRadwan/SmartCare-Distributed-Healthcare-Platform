import { IsString, IsNumber, Min, IsOptional, IsEmail } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  orderId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;
}