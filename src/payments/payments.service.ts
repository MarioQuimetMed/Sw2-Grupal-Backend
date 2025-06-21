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

      console.log(
        'Evento recibido pero no procesado (no es checkout.session.completed)',
      );
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
}
