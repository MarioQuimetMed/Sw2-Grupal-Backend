import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  price_monthly: number;

  @IsNumber()
  price_annual: number;

  @IsBoolean()
  @IsOptional()
  is_active: boolean = true;
}
