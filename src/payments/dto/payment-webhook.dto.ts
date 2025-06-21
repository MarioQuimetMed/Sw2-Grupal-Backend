import {
  IsString,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Clase para los metadatos de la sesión
class SessionMetadataDto {
  @IsString()
  userId: string;

  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  isAnnual?: string;
}

// Clase para el objeto de datos de la sesión
class SessionDataDto {
  @IsObject()
  @ValidateNested()
  @Type(() => SessionMetadataDto)
  metadata: SessionMetadataDto;

  @IsString()
  payment_status: string;

  @IsString()
  id: string;

  @IsString()
  object: string;

  @IsString()
  customer: string;
}

// Clase para el objeto de datos del evento
class EventDataDto {
  @IsString()
  object: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SessionDataDto)
  data: {
    object: SessionDataDto;
  };
}

// DTO principal para el webhook
export class PaymentWebhookDto {
  @IsString()
  id: string;

  @IsString()
  object: string;

  @IsString()
  type: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EventDataDto)
  data: EventDataDto;
}
