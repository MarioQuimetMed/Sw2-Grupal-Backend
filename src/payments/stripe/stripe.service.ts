/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY no está definida en las variables de entorno',
      );
    }

    this.stripe = new Stripe(apiKey);
  }

  /**
   * Crea una sesión de pago en Stripe
   */
  async createCheckoutSession(
    planId: number,
    userId: number,
    planName: string,
    priceAmount: number,
    successUrl: string,
    cancelUrl: string,
    isAnnual: boolean = false,
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planName,
            },
            unit_amount: Math.round(priceAmount * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
        planId: planId.toString(),
        isAnnual: isAnnual.toString(), // Añadir esta información es importante
      },
    });
  }

  /**
   * Verifica un webhook de Stripe
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET no está definida en las variables de entorno',
      );
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  // Añade este método a tu clase StripeService existente
  async retrieveCheckoutSession(sessionId: string) {
    try {
      // Recuperar la información de la sesión desde Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      // Verificar si el pago fue exitoso
      // Una sesión con status 'complete' y payment_status 'paid' indica un pago exitoso
      const isSuccessful =
        session.status === 'complete' && session.payment_status === 'paid';

      return {
        session,
        isSuccessful,
      };
    } catch (error) {
      console.error('Error al recuperar la sesión de pago:', error);
      throw new InternalServerErrorException(
        `Error al recuperar la sesión de pago: ${error.message}`,
      );

      //  console.error('Error al asignar plan:', assignError);
      //           throw new BadRequestException(
      //             `Error al asignar plan: ${assignError.message}`,
      //           );
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    userId: number,
    planId: number,
    isAnnual: boolean,
  ) {
    try {
      // Crear un PaymentIntent con Stripe
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
          isAnnual: isAnnual.toString(),
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
      };
    } catch (error) {
      console.error('Error al recuperar la sesión de pago:', error);
      throw new InternalServerErrorException(
        `Error al recuperar la sesión de pago: ${error.message}`,
      );
    }
  }
}
