import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from '../src/config/database';

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    await AppDataSource.synchronize(true);
  }
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});
