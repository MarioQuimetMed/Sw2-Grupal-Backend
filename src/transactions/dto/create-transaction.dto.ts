import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDate,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../../enums/transaction-type.enum';

export class CreateTransactionDto {
  @IsNumber()
  @IsNotEmpty({ message: 'El monto es requerido' })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha es requerida' })
  date: Date;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  @MaxLength(255, {
    message: 'La descripción no puede exceder los 255 caracteres',
  })
  description: string;

  @IsNumber()
  @IsNotEmpty({ message: 'El ID de la cuenta es requerido' })
  idAccount: number;

  @IsEnum(TransactionType, { message: 'El tipo debe ser ingreso o egreso' })
  @IsNotEmpty({ message: 'El tipo de transacción es requerido' })
  type: TransactionType;

  @IsNumber()
  @IsNotEmpty({ message: 'El ID de la categoría es requerido' })
  idCategory: number;
}
