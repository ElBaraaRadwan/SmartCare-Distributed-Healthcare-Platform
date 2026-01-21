import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateStockDto {
  @IsString()
  drugName: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minThreshold?: number;

  @IsOptional()
  @IsString()
  description?: string;
}