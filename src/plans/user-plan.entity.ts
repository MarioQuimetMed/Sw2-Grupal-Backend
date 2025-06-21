import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Plan } from './plans.entity';

@Entity('user_plan')
export class UserPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  plan_id: number;

  @Column()
  start_date: Date;

  @Column()
  end_date: Date;

  @Column()
  payment_status: string;

  @ManyToOne(() => User, (user) => user.userPlans)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Plan, (plan) => plan.userPlans)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;
}
