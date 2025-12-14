import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
} from 'typeorm';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  userId!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @VersionColumn()
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
