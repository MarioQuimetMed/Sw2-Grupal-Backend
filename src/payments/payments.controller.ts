import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Crear una sesión de pago para un plan
   */
  @Post('create-checkout-session')
  @UseGuards(AuthGuard('jwt'))
  async createCheckoutSession(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPaymentSession(createPaymentDto);
  }

  /**
   * Webhook para recibir eventos de Stripe
   * Este endpoint debe estar públicamente accesible para Stripe
   */
  @Post('webhook')
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException(
        'No se recibió el cuerpo de la solicitud en formato raw. Verifica la configuración del middleware.',
      );
    }

    return this.paymentsService.handleWebhookEvent(request.rawBody, signature);
  }
}
