import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDate,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDebtDto {
  @IsNumber()
  @IsNotEmpty({ message: 'El monto de la deuda es requerido' })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsNumber()
  @IsNotEmpty({ message: 'El monto principal es requerido' })
  @Min(0.01, { message: 'El monto principal debe ser mayor a 0' })
  principal_amount: number;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  start_date: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha de finalización es requerida' })
  end_date: Date;

  @IsNumber()
  @IsNotEmpty({ message: 'El ID de la cuenta es requerido' })
  idAccount: number;

  @IsNumber()
  @IsNotEmpty({ message: 'La tasa de interés es requerida' })
  @Min(0, { message: 'La tasa de interés no puede ser negativa' })
  interest_rate: number;

  @IsNumber()
  @IsNotEmpty({ message: 'El pago mensual es requerido' })
  @Min(0, { message: 'El pago mensual debe ser mayor a 0' })
  monthly_payment: number;

  @IsString()
  @IsNotEmpty({ message: 'El propósito de la deuda es requerido' })
  @MaxLength(255, {
    message: 'El propósito no puede exceder los 255 caracteres',
  })
  purpose: string;

  @IsString()
  @IsNotEmpty({ message: 'El estado de la deuda es requerido' })
  @IsIn(['activa', 'pagada', 'vencida', 'refinanciada'], {
    message: 'El estado debe ser: activa, pagada, vencida o refinanciada',
  })
  status: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de deuda es requerido' })
  @IsIn(
    [
      'hipotecaria',
      'personal',
      'automotriz',
      'estudiantil',
      'tarjeta_credito',
      'otra',
    ],
    { message: 'El tipo debe ser válido' },
  )
  type: string;
}
