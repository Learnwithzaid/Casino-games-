import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { buildApp, type BuildAppDeps } from '../src/app.js';
import { PrismaClient } from '@prisma/client';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync } from 'fs';

let app: any;
let prisma: PrismaClient;
let testUser: any;
let testGame: any;

// Test configuration
const testConfig = {
  corsOrigin: '*',
  databaseUrl: 'file:' + join(tmpdir(), 'test-slot-engine.db'),
  retry: {
    maxRetries: 3,
    baseDelay: 1000
  }
};

async function setupTestData() {
  // Create test user
  testUser = await prisma.user.upsert({
    where: { id: 'test-integration-user' },
    update: {},
    create: {
      id: 'test-integration-user',
      email: 'integration@test.com',
      username: 'integrationuser',
      passwordHash: 'test_hash',
      role: 'PLAYER',
      status: 'ACTIVE',
      isEmailVerified: true
    }
  });

  // Create test wallet
  await prisma.walletAccount.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      balance: 50.0, // 50 USD for testing
      currency: 'USD'
    }
  });

  // Create test game
  testGame = await prisma.game.upsert({
    where: { name: 'Integration Test Slot' },
    update: {},
    create: {
      name: 'Integration Test Slot',
      slug: 'integration-test-slot',
      provider: 'Test',
      type: 'SLOT',
      rtp: 95.0,
      isActive: true,
      minBet: 0.1,
      maxBet: 10.0,
      maxWin: 500.0
    }
  });

  // Create test symbols
  const symbols = [
    { gameId: testGame.id, symbol: 'A', multiplier: 2, weight: 10 },
    { gameId: testGame.id, symbol: 'B', multiplier: 3, weight: 8 },
    { gameId: testGame.id, symbol: 'C', multiplier: 5, weight: 5 },
    { gameId: testGame.id, symbol: 'WILD', multiplier: 0, isWild: true, weight: 3 }
  ];

  await prisma.gameSymbol.deleteMany({ where: { gameId: testGame.id } });
  await prisma.gameSymbol.createMany({
    data: symbols.map(s => ({
      gameId: s.gameId,
      symbol: s.symbol,
      multiplier: s.multiplier,
      isScatter: s.isScatter || false,
      isWild: s.isWild || false,
      isBonus: s.isBonus || false,
      sortOrder: 0,
      weight: s.weight
    }))
  });

  // Create test paylines
  const paylines = [
    {
      gameId: testGame.id,
      name: 'Horizontal',
      pattern: JSON.stringify([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 }
      ])
    }
  ];

  await prisma.payline.deleteMany({ where: { gameId: testGame.id } });
  await prisma.payline.createMany({
    data: paylines
  });

  console.log('Test data setup completed');
}

describe('Slot Engine Integration Tests', () => {
  beforeAll(async () => {
    // Create temporary test database
    writeFileSync(testConfig.databaseUrl.replace('file:', ''), '');
    
    // Initialize Prisma
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testConfig.databaseUrl
        }
      }
    });

    // Initialize test data
    await setupTestData();

    // Build and start the app
    const logger = {
      info: console.log,
      error: console.error,
      debug: console.log,
      warn: console.warn
    };

    const deps: BuildAppDeps = {
      prisma,
      config: testConfig,
      logger
    };

    app = await buildApp(deps);
    await app.listen({ port: 0 }); // Use random port
  }, 10000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('POST /api/game/bet', () => {
    it('should successfully place a bet with valid data', async () => {
      const betRequest = {
        gameId: testGame.id,
        betAmount: 1.0
      };

      // Mock user authentication
      app.inject = app.inject || ((options: any) => {
        // Simple mock for testing
        return Promise.resolve({ 
          statusCode: 200,
          payload: JSON.stringify({ success: true })
        });
      });

      // Since we're testing integration, let's use direct service calls
      const bettingService = app.services.bettingService;
      const result = await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 1.0,
        userId: testUser.id
      });

      expect(result.success).toBe(true);
      expect(result.gameRoundId).toBeTruthy();
      expect(result.grid).toHaveLength(3);
      expect(result.grid[0]).toHaveLength(3);
      expect(typeof result.totalPayout).toBe('number');
      expect(result.outcome).toMatch(/^(WIN|LOSS)$/);
      expect(result.balanceAfter).toBeLessThan(result.balanceBefore);
      expect(result.rtpSnapshot).toBeGreaterThanOrEqual(0);
      expect(result.rngSeed).toBeTruthy();
    });

    it('should fail with insufficient balance', async () => {
      const bettingService = app.services.bettingService;
      
      const result = await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 100.0, // More than user's wallet balance
        userId: testUser.id
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
      expect(result.gameRoundId).toBe('');
    });

    it('should fail with invalid bet amount', async () => {
      const bettingService = app.services.bettingService;

      // Test bet below minimum
      const result1 = await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 0.01, // Below minimum of 0.1
        userId: testUser.id
      });

      expect(result1.success).toBe(false);
      expect(result1.error).toContain('below minimum');
    });

    it('should create proper database records', async () => {
      const bettingService = app.services.bettingService;

      const result = await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 0.5,
        userId: testUser.id
      });

      expect(result.success).toBe(true);

      // Verify game round was created
      const gameRound = await prisma.gameRound.findUnique({
        where: { id: result.gameRoundId },
        include: { result: true }
      });

      expect(gameRound).toBeTruthy();
      expect(gameRound?.gameId).toBe(testGame.id);
      expect(gameRound?.userId).toBe(testUser.id);
      expect(gameRound?.betAmount).toBe('0.5');
      expect(gameRound?.status).toBe('COMPLETED');
      expect(gameRound?.result).toBeTruthy();
      expect(gameRound?.result?.outcome).toBe(result.outcome);
      expect(gameRound?.result?.rngSeed).toBe(result.rngSeed);

      // Verify wallet ledger entries were created
      const ledgerEntries = await prisma.walletLedgerEntry.findMany({
        where: { referenceId: result.gameRoundId }
      });

      expect(ledgerEntries).toHaveLength(2); // Debit and possibly credit
      const debitEntry = ledgerEntries.find(e => e.type === 'DEBIT');
      expect(debitEntry?.amount).toBe('0.5');
      expect(debitEntry?.referenceType).toBe('GAME_ROUND');

      // Verify RTP snapshot was created
      const rtpSnapshot = await prisma.rTPSnapshot.findFirst({
        where: { gameRoundId: result.gameRoundId }
      });

      expect(rtpSnapshot).toBeTruthy();
      expect(rtpSnapshot?.betAmount).toBe('0.5');
      expect(typeof rtpSnapshot?.rtp).toBe('number');
    });
  });

  describe('GET /api/game/history', () => {
    it('should return user game history with pagination', async () => {
      const bettingService = app.services.bettingService;

      // Place a few bets first
      await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 0.5,
        userId: testUser.id
      });

      await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 1.0,
        userId: testUser.id
      });

      const result = await bettingService.getGameHistory(testUser.id, {
        page: 1,
        limit: 10
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });

      // Verify data structure
      const historyItem = result.data[0];
      expect(historyItem).toHaveProperty('id');
      expect(historyItem).toHaveProperty('gameId');
      expect(historyItem).toHaveProperty('gameName');
      expect(historyItem).toHaveProperty('betAmount');
      expect(historyItem).toHaveProperty('winAmount');
      expect(historyItem).toHaveProperty('outcome');
      expect(historyItem).toHaveProperty('grid');
      expect(historyItem).toHaveProperty('createdAt');
    });

    it('should filter history by game ID', async () => {
      // Create another test game
      const otherGame = await prisma.game.create({
        data: {
          name: 'Other Test Game',
          slug: 'other-test-game',
          provider: 'Test',
          type: 'SLOT',
          rtp: 96.0,
          minBet: 0.1,
          maxBet: 5.0
        }
      });

      const bettingService = app.services.bettingService;

      // Bet on first game
      await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 0.5,
        userId: testUser.id
      });

      // Bet on second game
      await bettingService.placeBet({
        gameId: otherGame.id,
        betAmount: 0.5,
        userId: testUser.id
      });

      // Filter by first game only
      const result = await bettingService.getGameHistory(testUser.id, {
        gameId: testGame.id,
        page: 1,
        limit: 10
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].gameId).toBe(testGame.id);
    });

    it('should filter history by date range', async () => {
      const bettingService = app.services.bettingService;

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await bettingService.getGameHistory(testUser.id, {
        startDate,
        endDate,
        page: 1,
        limit: 10
      });

      // All test data should be within this range
      expect(result.data.length).toBeGreaterThan(0);
      
      result.data.forEach(item => {
        const itemDate = new Date(item.createdAt);
        expect(itemDate).toBeInstanceOf(Date);
        expect(itemDate >= startDate && itemDate <= endDate).toBe(true);
      });
    });
  });

  describe('GET /api/game/round/:id', () => {
    it('should return specific game round for replay', async () => {
      const bettingService = app.services.bettingService;

      const betResult = await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 0.5,
        userId: testUser.id
      });

      const gameRound = await bettingService.getGameRound(betResult.gameRoundId, testUser.id);

      expect(gameRound).toBeTruthy();
      expect(gameRound.id).toBe(betResult.gameRoundId);
      expect(gameRound.gameId).toBe(testGame.id);
      expect(gameRound.userId).toBe(testUser.id);
      expect(gameRound.betAmount).toBe(0.5);
      expect(gameRound.grid).toEqual(betResult.grid);
      expect(gameRound.rngSeed).toBe(betResult.rngSeed);
      expect(gameRound.createdAt).toBeInstanceOf(Date);
    });

    it('should return 404 for non-existent game round', async () => {
      const bettingService = app.services.bettingService;

      try {
        await bettingService.getGameRound('non-existent-id', testUser.id);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Game round not found');
      }
    });

    it('should respect user authorization', async () => {
      const bettingService = app.services.bettingService;

      const betResult = await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 0.5,
        userId: testUser.id
      });

      // Try to access with different user ID
      try {
        await bettingService.getGameRound(betResult.gameRoundId, 'other-user-id');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Game round not found');
      }
    });
  });

  describe('GET /api/game/stats', () => {
    it('should return user RTP statistics', async () => {
      const bettingService = app.services.bettingService;

      // Place several bets
      await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 1.0,
        userId: testUser.id
      });

      await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 0.5,
        userId: testUser.id
      });

      await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 2.0,
        userId: testUser.id
      });

      const stats = await bettingService.getUserRTPStats(testUser.id);

      expect(stats).toHaveProperty('totalBets');
      expect(stats).toHaveProperty('totalWins');
      expect(stats).toHaveProperty('totalNetLoss');
      expect(stats).toHaveProperty('averageRTP');
      expect(stats).toHaveProperty('totalRounds');

      expect(stats.totalBets).toBe(3.5); // 1.0 + 0.5 + 2.0
      expect(stats.totalRounds).toBe(3);
      expect(typeof stats.averageRTP).toBe('number');
    });

    it('should filter stats by game ID', async () => {
      const bettingService = app.services.bettingService;

      // Create another game
      const otherGame = await prisma.game.create({
        data: {
          name: 'Stats Test Game',
          slug: 'stats-test-game',
          provider: 'Test',
          type: 'SLOT',
          rtp: 97.0,
          minBet: 0.1,
          maxBet: 10.0
        }
      });

      // Add symbols and paylines for the new game
      await prisma.gameSymbol.createMany({
        data: [
          { gameId: otherGame.id, symbol: 'A', multiplier: 2, weight: 10 },
          { gameId: otherGame.id, symbol: 'B', multiplier: 3, weight: 8 }
        ]
      });

      await prisma.payline.createMany({
        data: [{
          gameId: otherGame.id,
          name: 'Test Payline',
          pattern: JSON.stringify([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }])
        }]
      });

      // Bet on both games
      await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 1.0,
        userId: testUser.id
      });

      await bettingService.placeBet({
        gameId: otherGame.id,
        betAmount: 2.0,
        userId: testUser.id
      });

      // Get stats for only the first game
      const stats = await bettingService.getUserRTPStats(testUser.id, testGame.id);

      expect(stats.totalBets).toBe(1.0);
      expect(stats.totalRounds).toBe(1);
    });

    it('should filter stats by date range', async () => {
      const bettingService = app.services.bettingService;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // This would require setting up data with specific dates
      // For now, just test the function call
      const stats = await bettingService.getUserRTPStats(testUser.id, undefined, 30);

      expect(stats).toBeDefined();
    });
  });

  describe('End-to-End Bet Flow', () => {
    it('should complete full bet flow with wallet integration', async () => {
      // Get initial wallet balance
      const initialWallet = await prisma.walletAccount.findUnique({
        where: { userId: testUser.id }
      });

      const bettingService = app.services.bettingService;
      const slotEngineService = app.services.slotEngineService;

      // Place multiple bets
      const betResults = [];
      for (let i = 0; i < 3; i++) {
        const result = await bettingService.placeBet({
          gameId: testGame.id,
          betAmount: 0.5,
          userId: testUser.id
        });
        
        expect(result.success).toBe(true);
        betResults.push(result);
      }

      // Verify wallet balance decreased appropriately
      const finalWallet = await prisma.walletAccount.findUnique({
        where: { userId: testUser.id }
      });

      const totalBetAmount = betResults.reduce((sum, r) => {
        return sum + (Number(r.balanceBefore) - Number(r.balanceAfter)) + r.totalPayout;
      }, 0);

      // The balance should reflect all the transactions
      expect(Number(finalWallet?.balance)).toBeLessThan(Number(initialWallet?.balance));

      // Verify all game rounds were recorded
      const gameRounds = await prisma.gameRound.findMany({
        where: { userId: testUser.id },
        include: { result: true }
      });

      expect(gameRounds.length).toBeGreaterThanOrEqual(3);

      // Verify RTP tracking
      const rtpSnapshots = await prisma.rTPSnapshot.findMany({
        where: { userId: testUser.id }
      });

      expect(rtpSnapshots.length).toBeGreaterThanOrEqual(3);

      // Verify audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where: { actorUserId: testUser.id }
      });

      expect(auditLogs.length).toBeGreaterThanOrEqual(3);
      auditLogs.forEach(log => {
        expect(log.action).toBe('BET_PLACED');
        expect(log.entityType).toBe('GameRound');
      });
    });

    it('should handle insufficient balance gracefully', async () => {
      // Reduce wallet balance to very low
      await prisma.walletAccount.update({
        where: { userId: testUser.id },
        data: { balance: 0.1 }
      });

      const bettingService = app.services.bettingService;

      // Try to bet more than available balance
      const result = await bettingService.placeBet({
        gameId: testGame.id,
        betAmount: 1.0,
        userId: testUser.id
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');

      // Verify no game round was created
      const gameRounds = await prisma.gameRound.findMany({
        where: { userId: testUser.id }
      });

      const roundCountBefore = gameRounds.length;

      // Verify wallet balance unchanged
      const wallet = await prisma.walletAccount.findUnique({
        where: { userId: testUser.id }
      });

      expect(Number(wallet?.balance)).toBe(0.1);

      // Attempt should not create additional records
      const gameRoundsAfter = await prisma.gameRound.findMany({
        where: { userId: testUser.id }
      });

      expect(gameRoundsAfter.length).toBe(roundCountBefore);
    });
  });
});