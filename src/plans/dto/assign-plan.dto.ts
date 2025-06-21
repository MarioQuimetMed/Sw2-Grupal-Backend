import { IsNumber, IsDate, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignPlanDto {
  @IsNumber()
  user_id: number;

  @IsNumber()
  plan_id: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  start_date?: Date;

  @IsDate()
  @Type(() => Date)
  end_date: Date;

  @IsString()
  @IsOptional()
  payment_status?: string;
}
