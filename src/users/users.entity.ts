import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from '../accounts/accounts.entity';
import { UserPlan } from '../plans/user-plan.entity';
import { Suggestion } from 'src/ai/suggest.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  termsAndPolicy: boolean;

  @OneToMany(() => Account, (account) => account.user)
  accounts: Account[];

  @OneToMany(() => UserPlan, (userPlan) => userPlan.user)
  userPlans: UserPlan[];

  @OneToMany(() => Suggestion, (suggestion) => suggestion.user)
  suggestions: Suggestion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
