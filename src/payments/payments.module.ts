import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlansModule } from '../plans/plans.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe/stripe.service';

@Module({
  imports: [ConfigModule, PlansModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeService], // Añadir StripeService aquí
  exports: [PaymentsService],
})
export class PaymentsModule {}
