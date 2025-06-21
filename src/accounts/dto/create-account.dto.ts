import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la cuenta es requerido' })
  name: string;

  @IsNumber()
  @Min(0, { message: 'El balance inicial no puede ser negativo' })
  @IsOptional()
  balance: number = 0;

  @IsNumber()
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  usuarioId: number;
}
