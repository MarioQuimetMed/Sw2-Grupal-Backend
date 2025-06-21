import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0, { message: 'El balance no puede ser negativo' })
  @IsOptional()
  balance?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
