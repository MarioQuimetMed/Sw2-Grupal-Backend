import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { CategoriesModule } from '../categories/categories.module';
import { AccountsModule } from 'src/accounts/accounts.module';
import { DebtsModule } from 'src/debts/debts.module';
import { HealthModule } from 'src/health/health.module';
import { BudgetsModule } from 'src/budgets/budgets.module';
import { Suggestion } from './suggest.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Suggestion]),
    TransactionsModule,
    CategoriesModule,
    AccountsModule,
    DebtsModule,
    HealthModule,
    BudgetsModule,
  ],
  providers: [AiService],
  controllers: [AiController],
})
export class AiModule {}
