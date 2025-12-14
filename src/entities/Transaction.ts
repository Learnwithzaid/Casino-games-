import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TransactionType, TransactionStatus } from '../types';

@Entity('transactions')
@Index(['userId', 'createdAt'])
@Index(['walletId', 'createdAt'])
@Index(['type', 'status'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  walletId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type!: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.COMPLETED,
  })
  status!: TransactionStatus;

  @Column({ type: 'uuid', nullable: true })
  gameRoundId?: string;

  @Column({ type: 'uuid', nullable: true })
  paymentWebhookId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balanceBefore!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balanceAfter!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
