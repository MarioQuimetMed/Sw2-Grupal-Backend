import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Budget } from '../budgets/budgets.entity';
import { Debt } from '../debts/debts.entity';

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  balance: number;

  @Column()
  usuarioId: number;

  @Column()
  name: string;

  @Column()
  is_active: boolean;

  @ManyToOne(() => User, (user) => user.accounts)
  @JoinColumn({ name: 'usuarioId' })
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.account)
  transactions: Transaction[];

  @OneToMany(() => Budget, (budget) => budget.account)
  budgets: Budget[];

  @OneToMany(() => Debt, (debt) => debt.account)
  debts: Debt[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
