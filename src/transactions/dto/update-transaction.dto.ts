import {
  IsOptional,
  IsNumber,
  IsString,
  IsDate,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../../enums/transaction-type.enum';

export class UpdateTransactionDto {
  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  @IsOptional()
  amount?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @IsString()
  @MaxLength(255, {
    message: 'La descripción no puede exceder los 255 caracteres',
  })
  @IsOptional()
  description?: string;

  @IsEnum(TransactionType, { message: 'El tipo debe ser ingreso o egreso' })
  @IsOptional()
  type?: TransactionType;

  @IsNumber()
  @IsOptional()
  idCategory?: number;
}
