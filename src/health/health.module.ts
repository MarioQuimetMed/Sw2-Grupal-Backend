// filepath: d:\MarioUniv\9no\Sw2\Grupal\sw2-grupal-backend\src\health\health.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { Transaction } from '../transactions/transaction.entity';
import { Account } from '../accounts/accounts.entity';
import { Debt } from '../debts/debts.entity';
import { Budget } from '../budgets/budgets.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Account, Debt, Budget])],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService], // Exportamos el servicio para que pueda ser utilizado en otros módulos
})
export class HealthModule {}
