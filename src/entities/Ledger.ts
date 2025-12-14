import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TransactionType, TransactionStatus, CorrelationType } from '../types';

@Entity('ledger')
@Index(['userId', 'createdAt'])
@Index(['walletId', 'createdAt'])
@Index(['correlationId', 'correlationType'])
export class Ledger {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'uuid' })
  walletId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type!: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
  })
  status!: TransactionStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  correlationId?: string;

  @Column({
    type: 'enum',
    enum: CorrelationType,
    nullable: true,
  })
  correlationType?: CorrelationType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balanceBefore!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balanceAfter!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
