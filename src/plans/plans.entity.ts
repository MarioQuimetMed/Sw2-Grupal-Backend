import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserPlan } from './user-plan.entity';

@Entity()
export class Plan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price_monthly: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price_annual: number;

  @Column()
  is_active: boolean;

  @OneToMany(() => UserPlan, (userPlan) => userPlan.plan)
  userPlans: UserPlan[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
