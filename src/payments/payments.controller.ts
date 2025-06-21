/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Param,
  RawBodyRequest,
  Req,
  UseGuards,
  BadRequestException,
  HttpException,
  HttpStatus,
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

  @Get('verify/:sessionId')
  async verifyPayment(@Param('sessionId') sessionId: string) {
    try {
      return await this.paymentsService.verifyPaymentSession(sessionId);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `Error al verificar el pago: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Añade este endpoint a tu controlador
  @Post('create-payment-intent')
  async createPaymentIntent(
    @Body()
    createPaymentDto: { userId: number; planId: number; isAnnual: boolean },
    @Req() request,
  ) {
    try {
      const { userId, planId, isAnnual } = createPaymentDto;

      // Verificar que el usuario esté autorizado
      if (request.user.id !== userId && !request.user.isAdmin) {
        throw new HttpException(
          'No autorizado para realizar esta acción',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return await this.paymentsService.createPaymentIntent(
        userId,
        planId,
        isAnnual,
      );
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Error al crear intención de pago: ${error.message}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
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
