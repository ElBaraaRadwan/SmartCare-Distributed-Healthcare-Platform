import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { ServiceType, HttpMethod } from '../../common/enums';

export class ProxyRequestDto {
  @IsEnum(ServiceType)
  service: ServiceType;

  @IsEnum(HttpMethod)
  method: HttpMethod;

  @IsString()
  path: string;

  @IsObject()
  headers: Record<string, string>;

  @IsOptional()
  @IsObject()
  body?: any;
}
