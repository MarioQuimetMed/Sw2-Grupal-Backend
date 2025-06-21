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
import { Category } from '../categories/categories.entity';
import { TransactionType } from '../enums/transaction-type.enum';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  date: Date;

  @Column()
  description: string;

  @Column()
  idAccount: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.EXPENSE,
  })
  type: TransactionType;

  @Column()
  idCategory: number;

  @ManyToOne(() => Account, (account) => account.transactions)
  @JoinColumn({ name: 'idAccount' })
  account: Account;

  @ManyToOne(() => Category, (category) => category.transactions)
  @JoinColumn({ name: 'idCategory' })
  category: Category;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
