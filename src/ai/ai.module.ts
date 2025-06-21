import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [TransactionsModule, CategoriesModule],
  providers: [AiService],
  controllers: [AiController],
})
export class AiModule {}
