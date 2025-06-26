import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/users.entity';

@Entity()
export class Suggestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  suggestion1: string;

  @Column({ type: 'text' })
  suggestion2: string;

  @Column({ type: 'text' })
  suggestion3: string;

  @ManyToOne(() => User, (user) => user.suggestions, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
