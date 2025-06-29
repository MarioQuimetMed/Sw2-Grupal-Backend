import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { Plan } from './plans.entity';
import { UserPlan } from './user-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, UserPlan])],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
