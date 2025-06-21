import {
  IsOptional,
  IsNumber,
  IsString,
  IsDate,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDebtDto {
  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  @IsOptional()
  amount?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  end_date?: Date;

  @IsNumber()
  @Min(0, { message: 'La tasa de interés no puede ser negativa' })
  @IsOptional()
  interest_rate?: number;

  @IsNumber()
  @Min(0, { message: 'El pago mensual debe ser mayor a 0' })
  @IsOptional()
  monthly_payment?: number;

  @IsString()
  @MaxLength(255, {
    message: 'El propósito no puede exceder los 255 caracteres',
  })
  @IsOptional()
  purpose?: string;

  @IsString()
  @IsIn(['activa', 'pagada', 'vencida', 'refinanciada'], {
    message: 'El estado debe ser: activa, pagada, vencida o refinanciada',
  })
  @IsOptional()
  status?: string;
}
