import { IsNumber, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  planId: number;

  @IsBoolean()
  isAnnual: boolean;

  //   @IsUrl()
  @IsNotEmpty()
  successUrl: string;

  //   @IsUrl()
  @IsNotEmpty()
  cancelUrl: string;
}
