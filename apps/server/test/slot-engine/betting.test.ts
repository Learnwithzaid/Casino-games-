import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { BettingService } from '../src/modules/slot-engine/betting.service.js';
import { SlotEngineService } from '../src/modules/slot-engine/slot-engine.service.js';
import { PrismaClient, WalletEntryType } from '@prisma/client';

// Mock all dependencies
const mockWalletService = {
  getBalance: vi.fn(),
  creditConfirmedPayment: vi.fn()
};

const mockPrisma = {
  $transaction: vi.fn(),
  walletAccount: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn()
  },
  gameRound: {
    create: vi.fn()
  },
  gameResult: {
    create: vi.fn()
  },
  walletLedgerEntry: {
    create: vi.fn()
  },
  auditLog: {
    create: vi.fn()
  },
  rTPSnapshot: {
    create: vi.fn()
  }
};

const mockSlotEngine = {
  validateBet: vi.fn(),
  generateSpin: vi.fn(),
  calculateRTP: vi.fn()
};

describe('BettingService', () => {
  let bettingService: BettingService;

  beforeEach(() => {
    bettingService = new BettingService(mockPrisma, mockSlotEngine, mockWalletService);
    vi.clearAllMocks();
  });

  describe('placeBet', () => {
    const validRequest = {
      gameId: 'game-1',
      betAmount: 1.0,
      userId: 'user-1'
    };

    it('should place a successful bet', async () => {
      // Mock wallet data
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: 100.0,
        currency: 'USD'
      };

      // Mock spin result
      const mockSpinResult = {
        grid: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
        winningLines: [{
          payline: { id: 'payline-1', name: 'Test Line', pattern: '[]', isActive: true },
          matches: 3,
          symbol: 'A',
          multiplier: 2.0,
          positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }]
        }],
        totalPayout: 2.0,
        outcome: 'WIN' as const,
        multiplier: 2.0,
        rngSeed: 'abc123'
      };

      // Mock transaction flow
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          walletAccount: {
            findUnique: vi.fn().mockResolvedValue(mockWallet),
            update: vi.fn()
          },
          gameRound: {
            create: vi.fn().mockResolvedValue({
              id: 'round-1',
              gameId: 'game-1',
              userId: 'user-1',
              betAmount: '1.0',
              winAmount: '2.0',
              status: 'COMPLETED',
              grid: JSON.stringify(mockSpinResult.grid),
              winningLines: JSON.stringify(mockSpinResult.winningLines),
              rtpSnapshot: 2.0
            })
          },
          gameResult: {
            create: vi.fn()
          },
          walletLedgerEntry: {
            create: vi.fn()
          },
          rTPSnapshot: {
            create: vi.fn()
          },
          auditLog: {
            create: vi.fn()
          }
        };

        return callback(mockTx);
      });

      mockSlotEngine.validateBet.mockResolvedValue(true);
      mockSlotEngine.generateSpin.mockResolvedValue(mockSpinResult);
      mockSlotEngine.calculateRTP.mockReturnValue(2.0);

      const result = await bettingService.placeBet(validRequest);

      expect(result.success).toBe(true);
      expect(result.gameRoundId).toBe('round-1');
      expect(result.grid).toEqual(mockSpinResult.grid);
      expect(result.totalPayout).toBe(2.0);
      expect(result.outcome).toBe('WIN');
      expect(result.balanceAfter).toBe(101.0); // 100 - 1 + 2
      expect(result.rtpSnapshot).toBe(2.0);
      expect(result.rngSeed).toBe(mockSpinResult.rngSeed);
      expect(result.error).toBeUndefined();
    });

    it('should handle insufficient balance', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          walletAccount: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'wallet-1',
              userId: 'user-1',
              balance: 0.5, // Insufficient balance
              currency: 'USD'
            })
          }
        };

        // This should throw an error
        try {
          return await callback(mockTx);
        } catch (error) {
          throw error;
        }
      });

      const result = await bettingService.placeBet(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
      expect(result.gameRoundId).toBe('');
    });

    it('should handle invalid bet amounts', async () => {
      mockSlotEngine.validateBet.mockResolvedValue(false);

      const result = await bettingService.placeBet({
        ...validRequest,
        betAmount: 0.001 // Too small
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid bet amount for this game');
    });

    it('should handle negative bet amounts', async () => {
      const result = await bettingService.placeBet({
        ...validRequest,
        betAmount: -1.0
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Bet amount must be positive');
    });

    it('should handle missing required fields', async () => {
      const result = await bettingService.placeBet({
        gameId: '',
        betAmount: 1.0,
        userId: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should handle net loss correctly', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: 100.0,
        currency: 'USD'
      };

      const mockSpinResult = {
        grid: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
        winningLines: [],
        totalPayout: 0,
        outcome: 'LOSS' as const,
        multiplier: 0,
        rngSeed: 'abc123'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          walletAccount: {
            findUnique: vi.fn().mockResolvedValue(mockWallet),
            update: vi.fn()
          },
          gameRound: {
            create: vi.fn().mockResolvedValue({
              id: 'round-1',
              gameId: 'game-1',
              userId: 'user-1',
              betAmount: '1.0',
              winAmount: '0',
              status: 'COMPLETED',
              grid: JSON.stringify(mockSpinResult.grid),
              winningLines: JSON.stringify(mockSpinResult.winningLines),
              rtpSnapshot: 0
            })
          },
          gameResult: {
            create: vi.fn()
          },
          walletLedgerEntry: {
            create: vi.fn()
          },
          rTPSnapshot: {
            create: vi.fn()
          },
          auditLog: {
            create: vi.fn()
          }
        };

        return callback(mockTx);
      });

      mockSlotEngine.validateBet.mockResolvedValue(true);
      mockSlotEngine.generateSpin.mockResolvedValue(mockSpinResult);
      mockSlotEngine.calculateRTP.mockReturnValue(0);

      const result = await bettingService.placeBet(validRequest);

      expect(result.success).toBe(true);
      expect(result.outcome).toBe('LOSS');
      expect(result.totalPayout).toBe(0);
      expect(result.balanceAfter).toBe(99.0); // 100 - 1 + 0
    });
  });

  describe('getGameHistory', () => {
    it('should retrieve user game history with pagination', async () => {
      const mockGameRounds = [
        {
          id: 'round-1',
          gameId: 'game-1',
          userId: 'user-1',
          betAmount: 1.0,
          winAmount: 2.0,
          status: 'COMPLETED',
          grid: '[["A","B","C"],["D","E","F"],["G","H","I"]]',
          winningLines: '[]',
          rtpSnapshot: 2.0,
          createdAt: new Date('2024-01-01'),
          game: { name: 'Test Game', type: 'SLOT' },
          result: { outcome: 'WIN', multiplier: 2.0 }
        }
      ];

      mockPrisma.gameRound.findMany = vi.fn().mockResolvedValue(mockGameRounds);
      mockPrisma.gameRound.count = vi.fn().mockResolvedValue(1);

      const result = await bettingService.getGameHistory('user-1', {
        page: 1,
        limit: 20
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      });

      const round = result.data[0];
      expect(round.id).toBe('round-1');
      expect(round.gameName).toBe('Test Game');
      expect(round.gameType).toBe('SLOT');
      expect(round.betAmount).toBe(1.0);
      expect(round.winAmount).toBe(2.0);
      expect(round.outcome).toBe('WIN');
      expect(round.grid).toEqual([['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']]);
      expect(round.winningLines).toEqual([]);
    });

    it('should filter history by game ID', async () => {
      mockPrisma.gameRound.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.gameRound.count = vi.fn().mockResolvedValue(0);

      await bettingService.getGameHistory('user-1', {
        gameId: 'game-1',
        page: 1,
        limit: 10
      });

      expect(mockPrisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            gameId: 'game-1'
          })
        })
      );
    });

    it('should filter history by date range', async () => {
      mockPrisma.gameRound.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.gameRound.count = vi.fn().mockResolvedValue(0);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await bettingService.getGameHistory('user-1', {
        startDate,
        endDate,
        page: 1,
        limit: 10
      });

      expect(mockPrisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          })
        })
      );
    });
  });

  describe('getUserRTPStats', () => {
    it('should calculate RTP statistics correctly', async () => {
      const mockSnapshots = [
        { rtp: 1.2, betAmount: 10, winAmount: 12 },
        { rtp: 0.8, betAmount: 5, winAmount: 4 },
        { rtp: 1.5, betAmount: 20, winAmount: 30 }
      ];

      mockPrisma.rTPSnapshot.findMany = vi.fn().mockResolvedValue(mockSnapshots);

      const stats = await bettingService.getUserRTPStats('user-1');

      expect(stats.totalBets).toBe(35); // 10 + 5 + 20
      expect(stats.totalWins).toBe(46); // 12 + 4 + 30
      expect(stats.totalNetLoss).toBe(-11); // 35 - 46
      expect(stats.averageRTP).toBeCloseTo(1.166, 2); // (1.2 + 0.8 + 1.5) / 3
      expect(stats.totalRounds).toBe(3);
    });

    it('should handle empty results', async () => {
      mockPrisma.rTPSnapshot.findMany = vi.fn().mockResolvedValue([]);

      const stats = await bettingService.getUserRTPStats('user-1');

      expect(stats).toEqual({
        totalBets: 0,
        totalWins: 0,
        totalNetLoss: 0,
        averageRTP: 0,
        totalRounds: 0
      });
    });

    it('should filter by game ID', async () => {
      mockPrisma.rTPSnapshot.findMany = vi.fn().mockResolvedValue([]);

      await bettingService.getUserRTPStats('user-1', 'game-1');

      expect(mockPrisma.rTPSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            gameId: 'game-1'
          },
          orderBy: { createdAt: 'desc' }
        })
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.rTPSnapshot.findMany = vi.fn().mockResolvedValue([]);

      const days = 30;
      await bettingService.getUserRTPStats('user-1', undefined, days);

      // Should create a where clause with date filter
      expect(mockPrisma.rTPSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            createdAt: expect.objectContaining({
              gte: expect.any(Date)
            })
          })
        })
      );
    });
  });
});

describe('Betting Service Integration Tests', () => {
  let bettingService: BettingService;
  let mockPrisma: any;
  let mockSlotEngine: any;
  let mockWalletService: any;

  beforeEach(() => {
    mockPrisma = { $transaction: vi.fn() };
    mockSlotEngine = { validateBet: vi.fn(), generateSpin: vi.fn(), calculateRTP: vi.fn() };
    mockWalletService = { getBalance: vi.fn() };

    bettingService = new BettingService(mockPrisma, mockSlotEngine, mockWalletService);
  });

  it('should handle concurrent bets from same user', async () => {
    // Mock successful bet flow
    mockSlotEngine.validateBet.mockResolvedValue(true);
    mockSlotEngine.generateSpin.mockImplementation((gameId, betAmount) => ({
      grid: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
      winningLines: [],
      totalPayout: betAmount, // Return exactly the bet amount (break even)
      outcome: 'LOSS',
      multiplier: 1,
      rngSeed: 'seed-' + Math.random().toString(36).substr(2, 9)
    }));
    mockSlotEngine.calculateRTP.mockReturnValue(1.0);

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        walletAccount: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'wallet-1',
            userId: 'user-1',
            balance: 100.0,
            currency: 'USD'
          }),
          update: vi.fn()
        },
        gameRound: {
          create: vi.fn().mockResolvedValue({
            id: 'round-' + Math.random().toString(36).substr(2, 9),
            status: 'COMPLETED'
          })
        },
        gameResult: { create: vi.fn() },
        walletLedgerEntry: { create: vi.fn() },
        auditLog: { create: vi.fn() },
        rTPSnapshot: { create: vi.fn() }
      };
      return callback(mockTx);
    });

    // Place multiple concurrent bets
    const bets = Array.from({ length: 5 }, (_, i) =>
      bettingService.placeBet({
        gameId: 'game-1',
        betAmount: 1.0,
        userId: 'user-1'
      })
    );

    const results = await Promise.all(bets);

    // All bets should succeed
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(result.gameRoundId).toMatch(/^round-/);
    });

    // Each bet should have unique game round IDs
    const roundIds = results.map(r => r.gameRoundId);
    const uniqueRoundIds = new Set(roundIds);
    expect(uniqueRoundIds.size).toBe(5);
  });

  it('should maintain transaction integrity on errors', async () => {
    let shouldFail = false;

    mockSlotEngine.validateBet.mockResolvedValue(true);
    mockSlotEngine.generateSpin.mockImplementation(() => {
      if (shouldFail) {
        throw new Error('Random failure during spin generation');
      }
      return {
        grid: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
        winningLines: [],
        totalPayout: 0,
        outcome: 'LOSS' as const,
        multiplier: 0,
        rngSeed: 'abc123'
      };
    });

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        walletAccount: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'wallet-1',
            userId: 'user-1',
            balance: 100.0,
            currency: 'USD'
          })
        }
      };

      return callback(mockTx);
    });

    // First attempt succeeds
    const result1 = await bettingService.placeBet({
      gameId: 'game-1',
      betAmount: 1.0,
      userId: 'user-1'
    });

    expect(result1.success).toBe(true);

    // Second attempt fails but should be handled gracefully
    shouldFail = true;
    const result2 = await bettingService.placeBet({
      gameId: 'game-1',
      betAmount: 1.0,
      userId: 'user-1'
    });

    expect(result2.success).toBe(false);
    expect(result2.error).toContain('Random failure during spin generation');
  });
});