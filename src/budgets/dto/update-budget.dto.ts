import {
  IsOptional,
  IsNumber,
  IsString,
  IsDate,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBudgetDto {
  @IsNumber()
  @Min(1, { message: 'El monto debe ser mayor a 0' })
  @IsOptional()
  amount?: number;

  @IsString()
  @MaxLength(255, {
    message: 'La descripción no puede exceder los 255 caracteres',
  })
  @IsOptional()
  description?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  start_date?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  end_date?: Date;
}
