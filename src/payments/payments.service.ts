/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe/stripe.service';
import { PlansService } from '../plans/plans.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private stripeService: StripeService,
    private plansService: PlansService,
    private configService: ConfigService,
  ) {}

  /**
   * Crear una sesión de pago para un plan
   */
  async createPaymentSession(createPaymentDto: CreatePaymentDto) {
    try {
      // Obtener el plan
      const plan = await this.plansService.findOne(createPaymentDto.planId);

      // Obtener el precio según el tipo de suscripción (mensual/anual)
      const price = createPaymentDto.isAnnual
        ? plan.price_annual
        : plan.price_monthly;

      // Obtener URLs de las variables de entorno
      const successUrlFromEnv =
        this.configService.get<string>('STRIPE_SUCCESS_URL');
      const cancelUrlFromEnv =
        this.configService.get<string>('STRIPE_CANCEL_URL');

      // Usar URLs proporcionadas o de variables de entorno
      const successUrl = createPaymentDto.successUrl || successUrlFromEnv;
      const cancelUrl = createPaymentDto.cancelUrl || cancelUrlFromEnv;

      // Verificar que las URLs estén definidas
      if (!successUrl || !cancelUrl) {
        throw new BadRequestException(
          'URLs de éxito y cancelación son requeridas. Proporciónelas en la solicitud o configúrelas en las variables de entorno.',
        );
      }

      // Crear sesión de pago en Stripe
      const session = await this.stripeService.createCheckoutSession(
        plan.id,
        createPaymentDto.userId,
        plan.name,
        price,
        successUrl,
        cancelUrl,
      );

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new BadRequestException(
        `Error al crear sesión de pago: ${errorMessage}`,
      );
    }
  }

  /**
   * Procesar el webhook de Stripe cuando se completa un pago
   */
  async handleWebhookEvent(payload: Buffer, signature: string) {
    try {
      console.log('Webhook recibido, verificando firma...');
      const event = this.stripeService.constructWebhookEvent(
        payload,
        signature,
      );

      console.log(`Evento recibido: ${event.type}`);

      // Verificar si es un evento de pago completado
      if (event.type === 'checkout.session.completed') {
        console.log('Evento de pago completado detectado');
        const session = event.data.object as any;

        // Depurar los metadatos completos
        console.log('Metadatos recibidos:', session.metadata);

        if (
          !session.metadata ||
          !session.metadata.userId ||
          !session.metadata.planId
        ) {
          console.error(
            'Metadatos incompletos en el webhook:',
            session.metadata,
          );
          throw new BadRequestException('Metadatos de la sesión incompletos');
        }

        const userId = parseInt(session.metadata.userId, 10);
        const planId = parseInt(session.metadata.planId, 10);

        console.log(`Asignando plan ${planId} al usuario ${userId}`);

        // Verificar si los IDs son números válidos
        if (isNaN(userId) || isNaN(planId)) {
          console.error(`IDs inválidos: userId=${userId}, planId=${planId}`);
          throw new BadRequestException('IDs de usuario o plan inválidos');
        }

        // Calcular fecha de fin (usando isAnnual si existe)
        const startDate = new Date();
        const endDate = new Date();

        const isAnnual = session.metadata.isAnnual === 'true';
        if (isAnnual) {
          console.log('Suscripción anual detectada');
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          console.log('Suscripción mensual detectada');
          endDate.setMonth(endDate.getMonth() + 1);
        }

        console.log(`Periodo de suscripción: ${startDate} a ${endDate}`);

        try {
          // Asignar el plan al usuario
          const userPlan = await this.plansService.assignPlanToUser({
            user_id: userId,
            plan_id: planId,
            start_date: startDate,
            end_date: endDate,
            payment_status: 'completed',
          });

          console.log('Plan asignado correctamente:', userPlan);
          return { success: true, userPlanId: userPlan.id };
        } catch (assignError) {
          console.error('Error al asignar plan:', assignError);
          throw new BadRequestException(
            `Error al asignar plan: ${assignError.message}`,
          );
        }
      }
      //Bloque para Flutter-------------------------------------------------------------
      if (event.type === 'payment_intent.succeeded') {
        console.log('Evento de PaymentIntent completado detectado');
        const paymentIntent = event.data.object;

        // Extraer los metadatos
        if (
          !paymentIntent.metadata ||
          !paymentIntent.metadata.userId ||
          !paymentIntent.metadata.planId
        ) {
          console.error('Metadatos incompletos:', paymentIntent.metadata);
          throw new BadRequestException(
            'Metadatos del PaymentIntent incompletos',
          );
        }

        const userId = parseInt(paymentIntent.metadata.userId, 10);
        const planId = parseInt(paymentIntent.metadata.planId, 10);
        const isAnnual = paymentIntent.metadata.isAnnual === 'true';

        // Calcular fechas de suscripción
        const startDate = new Date();
        const endDate = new Date();

        if (isAnnual) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        // Asignar el plan al usuario
        const userPlan = await this.plansService.assignPlanToUser({
          user_id: userId,
          plan_id: planId,
          start_date: startDate,
          end_date: endDate,
          payment_status: 'completed',
        });

        return { success: true, userPlanId: userPlan.id };
      }

      return { received: true, processed: false };
    } catch (error) {
      console.error('Error procesando webhook:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new BadRequestException(
        `Error al procesar webhook: ${errorMessage}`,
      );
    }
  }

  async verifyPaymentSession(sessionId: string) {
    try {
      const { session, isSuccessful } =
        await this.stripeService.retrieveCheckoutSession(sessionId);

      if (isSuccessful) {
        // Opcional: Puedes actualizar la base de datos aquí para marcar la suscripción como activa
        // si es que esto no lo estás haciendo ya en el webhook

        return {
          success: true,
          status: session.status,
          paymentStatus: session.payment_status,
          customerId: session.customer,
          subscriptionId: session.subscription,
          // Puedes incluir más datos relevantes para tu aplicación
        };
      } else {
        return {
          success: false,
          status: session.status,
          paymentStatus: session.payment_status,
          message: 'El pago no se ha completado exitosamente',
        };
      }
    } catch (error) {
      throw new Error(`Error al verificar el pago: ${error.message}`);
    }
  }

  async createPaymentIntent(userId: number, planId: number, isAnnual: boolean) {
    try {
      // Obtener el plan para calcular el precio
      const plan = await this.plansService.findOne(planId);
      if (!plan) {
        throw new Error(`Plan con ID ${planId} no encontrado`);
      }

      // Calcular el precio en centavos
      const price = isAnnual
        ? plan.price_annual * 100
        : plan.price_monthly * 100;

      // Crear el PaymentIntent
      return await this.stripeService.createPaymentIntent(
        Math.round(price), // Stripe requiere un entero
        'usd',
        userId,
        planId,
        isAnnual,
      );
    } catch (error) {
      throw new Error(`Error al crear intención de pago: ${error.message}`);
    }
  }
}
