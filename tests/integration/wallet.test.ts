import request from 'supertest';
import { createApp } from '../../src/app';
import { WalletService } from '../../src/services/WalletService';
import { AppDataSource } from '../../src/config/database';
import { Wallet } from '../../src/entities/Wallet';
import { v4 as uuidv4 } from 'uuid';

const app = createApp();

describe('Wallet Service Integration Tests', () => {
  let walletService: WalletService;

  beforeAll(() => {
    walletService = new WalletService();
  });

  beforeEach(async () => {
    await AppDataSource.getRepository(Wallet).clear();
    await AppDataSource.query('DELETE FROM transactions');
    await AppDataSource.query('DELETE FROM ledger');
    await AppDataSource.query('DELETE FROM settings');
  });

  describe('GET /api/user/balance', () => {
    it('should return user balance', async () => {
      const userId = uuidv4();
      await walletService.getOrCreateWallet(userId);

      const response = await request(app)
        .get('/api/user/balance')
        .set('x-user-id', userId)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBe(0);
      expect(response.body.data.currency).toBe('USD');
    });

    it('should return 401 without authentication', async () => {
      await request(app).get('/api/user/balance').expect(401);
    });
  });

  describe('Deposit and Withdrawal', () => {
    it('should successfully deposit funds', async () => {
      const userId = uuidv4();
      const paymentWebhookId = uuidv4();

      const response = await request(app)
        .post('/api/user/deposit')
        .set('x-user-id', userId)
        .send({ amount: 100, paymentWebhookId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balanceAfter).toBe(100);
    });

    it('should fail deposit with invalid amount', async () => {
      const userId = uuidv4();
      const paymentWebhookId = uuidv4();

      const response = await request(app)
        .post('/api/user/deposit')
        .set('x-user-id', userId)
        .send({ amount: -100, paymentWebhookId })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should successfully withdraw funds', async () => {
      const userId = uuidv4();
      const paymentWebhookId = uuidv4();

      await walletService.deposit(userId, 200, uuidv4());

      const response = await request(app)
        .post('/api/user/withdrawal')
        .set('x-user-id', userId)
        .send({ amount: 50, paymentWebhookId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balanceAfter).toBe(150);
    });

    it('should fail withdrawal with insufficient funds', async () => {
      const userId = uuidv4();
      const paymentWebhookId = uuidv4();

      await walletService.deposit(userId, 50, uuidv4());

      const response = await request(app)
        .post('/api/user/withdrawal')
        .set('x-user-id', userId)
        .send({ amount: 100, paymentWebhookId })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient funds');
    });
  });

  describe('Game Operations', () => {
    it('should successfully place bet and credit win', async () => {
      const userId = uuidv4();
      const gameRoundId = uuidv4();

      await walletService.deposit(userId, 1000, uuidv4());

      const betResponse = await request(app)
        .post('/api/game/bet')
        .set('x-user-id', userId)
        .send({ amount: 100, gameRoundId })
        .expect(200);

      expect(betResponse.body.success).toBe(true);
      expect(betResponse.body.data.balanceAfter).toBe(900);

      const winResponse = await request(app)
        .post('/api/game/win')
        .set('x-user-id', userId)
        .send({ amount: 200, gameRoundId })
        .expect(200);

      expect(winResponse.body.success).toBe(true);
      expect(winResponse.body.data.balanceAfter).toBe(1100);
    });

    it('should fail bet with insufficient funds', async () => {
      const userId = uuidv4();
      const gameRoundId = uuidv4();

      await walletService.deposit(userId, 50, uuidv4());

      const response = await request(app)
        .post('/api/game/bet')
        .set('x-user-id', userId)
        .send({ amount: 100, gameRoundId })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient funds');
    });

    it('should respect bet limits', async () => {
      const userId = uuidv4();
      const gameRoundId = uuidv4();

      await walletService.setSetting('MAX_BET_AMOUNT', '100');
      await walletService.deposit(userId, 10000, uuidv4());

      const response = await request(app)
        .post('/api/game/bet')
        .set('x-user-id', userId)
        .send({ amount: 500, gameRoundId })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('exceeds maximum');
    });
  });

  describe('Transaction History', () => {
    it('should return paginated transaction history', async () => {
      const userId = uuidv4();

      for (let i = 0; i < 15; i++) {
        await walletService.deposit(userId, 10, uuidv4());
      }

      const response = await request(app)
        .get('/api/game/history')
        .set('x-user-id', userId)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.total).toBe(15);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    it('should filter transactions by type', async () => {
      const userId = uuidv4();
      const gameRoundId = uuidv4();

      await walletService.deposit(userId, 1000, uuidv4());
      await walletService.betDebit(userId, 100, gameRoundId);
      await walletService.winCredit(userId, 200, gameRoundId);

      const response = await request(app)
        .get('/api/game/history')
        .set('x-user-id', userId)
        .query({ type: 'bet' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('bet');
    });
  });

  describe('Admin Operations', () => {
    it('should allow admin to view all transactions', async () => {
      const userId1 = uuidv4();
      const userId2 = uuidv4();
      const adminId = uuidv4();

      await walletService.deposit(userId1, 100, uuidv4());
      await walletService.deposit(userId2, 200, uuidv4());

      const response = await request(app)
        .get('/api/admin/transactions')
        .set('x-user-id', adminId)
        .set('x-user-role', 'admin')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should deny non-admin access to admin endpoints', async () => {
      const userId = uuidv4();

      await request(app)
        .get('/api/admin/transactions')
        .set('x-user-id', userId)
        .set('x-user-role', 'user')
        .expect(403);
    });

    it('should allow admin to make adjustments', async () => {
      const userId = uuidv4();
      const adminId = uuidv4();

      await walletService.deposit(userId, 100, uuidv4());

      const response = await request(app)
        .post('/api/admin/adjustment')
        .set('x-user-id', adminId)
        .set('x-user-role', 'admin')
        .send({
          userId,
          amount: 50,
          reason: 'Promotional credit',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balanceAfter).toBe(150);
    });

    it('should allow admin to view user balance', async () => {
      const userId = uuidv4();
      const adminId = uuidv4();

      await walletService.deposit(userId, 500, uuidv4());

      const response = await request(app)
        .get(`/api/admin/user/${userId}/balance`)
        .set('x-user-id', adminId)
        .set('x-user-role', 'admin')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBe(500);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent debits atomically', async () => {
      const userId = uuidv4();
      await walletService.deposit(userId, 1000, uuidv4());

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          walletService.betDebit(userId, 50, uuidv4()).catch((err) => err)
        );
      }

      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.success).length;
      const finalBalance = await walletService.getBalance(userId);

      expect(finalBalance.balance).toBe(1000 - successCount * 50);
    });

    it('should handle concurrent credits atomically', async () => {
      const userId = uuidv4();
      await walletService.deposit(userId, 100, uuidv4());

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(walletService.winCredit(userId, 50, uuidv4()));
      }

      await Promise.all(promises);

      const finalBalance = await walletService.getBalance(userId);
      expect(finalBalance.balance).toBe(600);
    });

    it('should handle mixed concurrent operations atomically', async () => {
      const userId = uuidv4();
      await walletService.deposit(userId, 1000, uuidv4());

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          walletService.betDebit(userId, 50, uuidv4()).catch((err) => err)
        );
        promises.push(walletService.winCredit(userId, 30, uuidv4()));
      }

      const results = await Promise.all(promises);

      const finalBalance = await walletService.getBalance(userId);
      const successfulDebits = results.filter(
        (r) => r.success && r.balanceBefore !== undefined
      ).length / 2;

      expect(finalBalance.balance).toBeGreaterThan(0);
      expect(finalBalance.balance).toBeLessThanOrEqual(1000);
    });
  });

  describe('Ledger Correctness', () => {
    it('should create dual entries for each transaction', async () => {
      const userId = uuidv4();
      await walletService.deposit(userId, 100, uuidv4());

      const transactions = await AppDataSource.query(
        'SELECT COUNT(*) as count FROM transactions WHERE user_id = $1',
        [userId]
      );

      const ledger = await AppDataSource.query(
        'SELECT COUNT(*) as count FROM ledger WHERE user_id = $1',
        [userId]
      );

      expect(parseInt(transactions[0].count)).toBe(1);
      expect(parseInt(ledger[0].count)).toBe(1);
    });

    it('should maintain correct before/after balances in ledger', async () => {
      const userId = uuidv4();
      const gameRoundId = uuidv4();

      await walletService.deposit(userId, 1000, uuidv4());
      await walletService.betDebit(userId, 100, gameRoundId);
      await walletService.winCredit(userId, 200, gameRoundId);

      const ledgerEntries = await AppDataSource.query(
        'SELECT * FROM ledger WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
      );

      expect(parseFloat(ledgerEntries[0].balance_before)).toBe(0);
      expect(parseFloat(ledgerEntries[0].balance_after)).toBe(1000);

      expect(parseFloat(ledgerEntries[1].balance_before)).toBe(1000);
      expect(parseFloat(ledgerEntries[1].balance_after)).toBe(900);

      expect(parseFloat(ledgerEntries[2].balance_before)).toBe(900);
      expect(parseFloat(ledgerEntries[2].balance_after)).toBe(1100);
    });

    it('should store correlation IDs in ledger', async () => {
      const userId = uuidv4();
      const gameRoundId = uuidv4();

      await walletService.betDebit(userId, 100, gameRoundId);

      const ledgerEntries = await AppDataSource.query(
        'SELECT * FROM ledger WHERE user_id = $1 AND correlation_id = $2',
        [userId, gameRoundId]
      );

      expect(ledgerEntries.length).toBeGreaterThan(0);
      expect(ledgerEntries[0].correlation_type).toBe('game_round');
    });
  });
});
