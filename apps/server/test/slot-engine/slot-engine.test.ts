import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { SlotEngineService } from '../src/modules/slot-engine/slot-engine.service.js';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
const mockPrisma = {
  game: {
    findUnique: vi.fn()
  }
} as any;

describe('SlotEngineService', () => {
  let slotEngineService: SlotEngineService;

  beforeEach(() => {
    slotEngineService = new SlotEngineService(mockPrisma);
    vi.clearAllMocks();
  });

  const mockGame = {
    id: 'game-1',
    name: 'Test Slot',
    slug: 'test-slot',
    provider: 'Test Provider',
    type: 'SLOT',
    rtp: 95.0,
    isActive: true,
    minBet: 0.01,
    maxBet: 100.0,
    maxWin: 10000.0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockSymbols = [
    {
      id: 'symbol-1',
      gameId: 'game-1',
      symbol: 'CHERRY',
      multiplier: 2.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 0,
      weight: 10
    },
    {
      id: 'symbol-2',
      gameId: 'game-1',
      symbol: 'BAR',
      multiplier: 3.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 1,
      weight: 8
    },
    {
      id: 'symbol-3',
      gameId: 'game-1',
      symbol: 'SEVEN',
      multiplier: 5.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 2,
      weight: 5
    }
  ];

  const mockPaylines = [
    {
      id: 'payline-1',
      gameId: 'game-1',
      name: 'Horizontal Top',
      pattern: JSON.stringify([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 }
      ]),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'payline-2',
      gameId: 'game-1',
      name: 'Horizontal Middle',
      pattern: JSON.stringify([
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 }
      ]),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  describe('loadGameConfig', () => {
    it('should load and cache game configuration', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        ...mockGame,
        symbols: mockSymbols,
        paylines: mockPaylines
      });

      const config = await slotEngineService.loadGameConfig('game-1');

      expect(config.game).toEqual(mockGame);
      expect(config.symbols).toEqual(mockSymbols);
      expect(config.paylines).toEqual(mockPaylines);
      expect(config.rtpTarget).toBe(95.0);
      expect(config.minBet).toBe(0.01);
      expect(config.maxBet).toBe(100.0);
      expect(config.maxWin).toBe(10000.0);

      // Verify cache was populated
      const cacheStats = slotEngineService.getCacheStats();
      expect(cacheStats.size).toBe(1);
      expect(cacheStats.games).toContain('game-1');
    });

    it('should return cached configuration on subsequent calls', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        ...mockGame,
        symbols: mockSymbols,
        paylines: mockPaylines
      });

      await slotEngineService.loadGameConfig('game-1');
      await slotEngineService.loadGameConfig('game-1');

      // Should only be called once due to caching
      expect(mockPrisma.game.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw error when game is not found', async () => {
      mockPrisma.game.findUnique.mockResolvedValue(null);

      await expect(slotEngineService.loadGameConfig('nonexistent'))
        .rejects.toThrow('Game not found: nonexistent');
    });

    it('should throw error when game is not active', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        ...mockGame,
        isActive: false,
        symbols: mockSymbols,
        paylines: mockPaylines
      });

      await expect(slotEngineService.loadGameConfig('game-1'))
        .rejects.toThrow('Game is not active: game-1');
    });
  });

  describe('generateSpin', () => {
    beforeEach(() => {
      mockPrisma.game.findUnique.mockResolvedValue({
        ...mockGame,
        symbols: mockSymbols,
        paylines: mockPaylines
      });
    });

    it('should generate a valid spin result', async () => {
      const result = await slotEngineService.generateSpin('game-1', 1.0);

      expect(result).toHaveProperty('grid');
      expect(result).toHaveProperty('winningLines');
      expect(result).toHaveProperty('totalPayout');
      expect(result).toHaveProperty('outcome');
      expect(result).toHaveProperty('multiplier');
      expect(result).toHaveProperty('rngSeed');

      expect(result.grid).toHaveLength(3);
      expect(result.grid[0]).toHaveLength(3);
      expect(result.outcome).toMatch(/^(WIN|LOSS|BONUS)$/);
      expect(result.multiplier).toBeGreaterThan(0);
      expect(result.rngSeed).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should validate bet amount against minimum limit', async () => {
      await expect(slotEngineService.generateSpin('game-1', 0.005))
        .rejects.toThrow('Bet amount 0.005 is below minimum 0.01');
    });

    it('should validate bet amount against maximum limit', async () => {
      await expect(slotEngineService.generateSpin('game-1', 150))
        .rejects.toThrow('Bet amount 150 exceeds maximum 100');
    });
  });

  describe('validateBet', () => {
    beforeEach(() => {
      mockPrisma.game.findUnique.mockResolvedValue({
        ...mockGame,
        symbols: mockSymbols,
        paylines: mockPaylines
      });
    });

    it('should validate valid bet amounts', async () => {
      expect(await slotEngineService.validateBet('game-1', 0.5)).toBe(true);
      expect(await slotEngineService.validateBet('game-1', 5.0)).toBe(true);
    });

    it('should reject bets below minimum', async () => {
      expect(await slotEngineService.validateBet('game-1', 0.005)).toBe(false);
    });

    it('should reject bets above maximum', async () => {
      expect(await slotEngineService.validateBet('game-1', 150)).toBe(false);
    });
  });

  describe('calculateRTP', () => {
    it('should calculate RTP correctly', () => {
      // 100% RTP (no loss, no win)
      expect(slotEngineService.calculateRTP(10, 10)).toBe(1.0);
      
      // 50% RTP (loss)
      expect(slotEngineService.calculateRTP(10, 5)).toBe(0.5);
      
      // 200% RTP (win)
      expect(slotEngineService.calculateRTP(10, 20)).toBe(2.0);
    });

    it('should handle edge cases', () => {
      expect(slotEngineService.calculateRTP(0, 0)).toBe(0);
      expect(slotEngineService.calculateRTP(10, 0)).toBe(0);
    });
  });

  describe('cache management', () => {
    beforeEach(() => {
      mockPrisma.game.findUnique.mockResolvedValue({
        ...mockGame,
        symbols: mockSymbols,
        paylines: mockPaylines
      });
    });

    it('should clear specific game cache', async () => {
      await slotEngineService.loadGameConfig('game-1');
      expect(slotEngineService.getCacheStats().size).toBe(1);

      slotEngineService.clearCache('game-1');
      expect(slotEngineService.getCacheStats().size).toBe(0);
    });

    it('should clear all cache', async () => {
      // Note: We only have one game in our test setup
      mockPrisma.game.findUnique.mockResolvedValueOnce({
        ...mockGame,
        symbols: mockSymbols,
        paylines: mockPaylines
      }).mockResolvedValueOnce({
        ...mockGame,
        id: 'game-2',
        name: 'Test Slot 2',
        symbols: mockSymbols,
        paylines: mockPaylines
      });

      await slotEngineService.loadGameConfig('game-1');
      await slotEngineService.loadGameConfig('game-2');
      expect(slotEngineService.getCacheStats().size).toBe(2);

      slotEngineService.clearCache();
      expect(slotEngineService.getCacheStats().size).toBe(0);
    });
  });
});

describe('SlotEngine Integration Tests', () => {
  let slotEngineService: SlotEngineService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      game: {
        findUnique: vi.fn()
      }
    };
    slotEngineService = new SlotEngineService(mockPrisma);
  });

  it('should handle multiple concurrent spins', async () => {
    const mockGame = {
      id: 'game-1',
      name: 'Test Slot',
      type: 'SLOT',
      rtp: 95.0,
      isActive: true,
      minBet: 0.01,
      maxBet: 100.0,
      maxWin: 10000.0
    };

    const mockSymbols = [
      { symbol: 'A', multiplier: 2, isWild: false, weight: 10 },
      { symbol: 'B', multiplier: 3, isWild: false, weight: 8 },
      { symbol: 'C', multiplier: 5, isWild: false, weight: 5 }
    ];

    const mockPaylines = [
      {
        id: 'payline-1',
        name: 'Horizontal',
        pattern: JSON.stringify([
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 }
        ]),
        isActive: true
      }
    ];

    mockPrisma.game.findUnique.mockResolvedValue({
      ...mockGame,
      symbols: mockSymbols,
      paylines: mockPaylines
    });

    // Generate multiple spins concurrently
    const spins = Array.from({ length: 10 }, () =>
      slotEngineService.generateSpin('game-1', 1.0)
    );

    const results = await Promise.all(spins);

    // All should succeed
    results.forEach((result, index) => {
      expect(result.grid).toHaveLength(3);
      expect(result.grid[0]).toHaveLength(3);
      expect(result.rngSeed).toMatch(/^[a-f0-9]{64}$/);
    });

    // Verify all RNG seeds are unique
    const uniqueSeeds = new Set(results.map(r => r.rngSeed));
    expect(uniqueSeeds.size).toBe(10);
  });
});