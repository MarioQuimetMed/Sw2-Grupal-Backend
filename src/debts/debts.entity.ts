import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from '../accounts/accounts.entity';

@Entity()
export class Debt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  start_date: Date;

  @Column()
  end_date: Date;

  @Column()
  idAccount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  interest_rate: number;

  @Column()
  monthly_payment: number;

  @Column('decimal', { precision: 10, scale: 2 })
  principal_amount: number;

  @Column()
  purpose: string;

  @Column()
  status: string;

  @Column()
  type: string;

  @ManyToOne(() => Account, (account) => account.debts)
  @JoinColumn({ name: 'idAccount' })
  account: Account;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
