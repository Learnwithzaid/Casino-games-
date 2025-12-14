import { DataSource } from 'typeorm';
import { Wallet } from '../entities/Wallet';
import { Transaction } from '../entities/Transaction';
import { Ledger } from '../entities/Ledger';
import { Settings } from '../entities/Settings';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'wallet_ledger',
  synchronize: process.env.DB_SYNC === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [Wallet, Transaction, Ledger, Settings],
  migrations: [],
  subscribers: [],
});
