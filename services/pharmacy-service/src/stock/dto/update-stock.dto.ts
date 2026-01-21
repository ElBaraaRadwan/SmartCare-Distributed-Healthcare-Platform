import { IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class UpdateStockDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minThreshold?: number;

  @IsOptional()
  @IsString()
  description?: string;
}