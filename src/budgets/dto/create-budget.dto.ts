import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDate,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @IsNumber()
  @IsNotEmpty({ message: 'El monto del presupuesto es requerido' })
  @Min(1, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del presupuesto es requerida' })
  @MaxLength(255, {
    message: 'La descripción no puede exceder los 255 caracteres',
  })
  description: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  start_date: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha de fin es requerida' })
  end_date: Date;

  @IsNumber()
  @IsNotEmpty({ message: 'El ID de la cuenta es requerido' })
  idAccount: number;
}
