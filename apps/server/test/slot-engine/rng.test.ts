import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SlotRNGService } from '../src/modules/slot-engine/rng.service.js';

describe('SlotRNGService', () => {
  let rngService: SlotRNGService;

  beforeEach(() => {
    rngService = new SlotRNGService();
    // Clear any seed counter state
    vi.clearAllMocks();
  });

  describe('generateSecureRandom', () => {
    it('should generate random bytes with specified length', () => {
      const bytes = rngService.generateSecureRandom(16);
      expect(bytes).toBeInstanceOf(Buffer);
      expect(bytes.length).toBe(16);
    });

    it('should generate different random bytes on subsequent calls', () => {
      const bytes1 = rngService.generateSecureRandom(16);
      const bytes2 = rngService.generateSecureRandom(16);
      expect(bytes1).not.toEqual(bytes2);
    });
  });

  describe('generateRandomFloat', () => {
    it('should generate a float between 0 and 1', () => {
      const randomFloat = rngService.generateRandomFloat();
      expect(typeof randomFloat).toBe('number');
      expect(randomFloat).toBeGreaterThanOrEqual(0);
      expect(randomFloat).toBeLessThan(1);
    });

    it('should generate different floats on subsequent calls', () => {
      const floats = new Set();
      for (let i = 0; i < 100; i++) {
        floats.add(rngService.generateRandomFloat());
      }
      // With 100 iterations, we should have mostly unique values
      expect(floats.size).toBeGreaterThan(90);
    });
  });

  describe('generateRandomInt', () => {
    it('should generate integer within specified range', () => {
      const min = 1;
      const max = 10;
      const randomInt = rngService.generateRandomInt(min, max);
      expect(typeof randomInt).toBe('number');
      expect(randomInt).toBeGreaterThanOrEqual(min);
      expect(randomInt).toBeLessThanOrEqual(max);
    });

    it('should handle edge cases', () => {
      expect(rngService.generateRandomInt(1, 1)).toBe(1);
    });

    it('should throw error when min >= max', () => {
      expect(() => rngService.generateRandomInt(10, 5)).toThrow();
      expect(() => rngService.generateRandomInt(5, 5)).toThrow();
    });
  });

  describe('generateWeightedRandom', () => {
    it('should select items based on weights', () => {
      const items = ['A', 'B', 'C'];
      const weights = [1, 2, 3]; // C should be selected most often
      
      const selections: Record<string, number> = { A: 0, B: 0, C: 0 };
      
      // Generate many samples to test distribution
      for (let i = 0; i < 1000; i++) {
        const selected = rngService.generateWeightedRandom(items, weights);
        selections[selected]++;
      }
      
      // C should have the highest frequency (around 50%)
      expect(selections.C).toBeGreaterThan(selections.B);
      expect(selections.B).toBeGreaterThan(selections.A);
      expect(selections.C).toBeGreaterThan(300);
    });

    it('should throw error when items and weights arrays have different lengths', () => {
      const items = ['A', 'B', 'C'];
      const weights = [1, 2];
      expect(() => rngService.generateWeightedRandom(items, weights)).toThrow();
    });
  });

  describe('generateSeed', () => {
    it('should generate a unique seed with required fields', () => {
      const seed1 = rngService.generateSeed();
      const seed2 = rngService.generateSeed();
      
      expect(seed1).toHaveProperty('seed');
      expect(seed1).toHaveProperty('timestamp');
      expect(seed1).toHaveProperty('sequence');
      
      expect(typeof seed1.seed).toBe('string');
      expect(seed1.seed.length).toBeGreaterThan(0);
      expect(typeof seed1.timestamp).toBe('number');
      expect(typeof seed1.sequence).toBe('number');
      
      expect(seed1.seed).not.toBe(seed2.seed);
      expect(seed1.sequence).toBeLessThan(seed2.sequence);
    });
  });

  describe('generateGrid', () => {
    it('should generate a 3x3 grid', () => {
      const symbols = [
        { symbol: 'A', weight: 1 },
        { symbol: 'B', weight: 1 },
        { symbol: 'C', weight: 1 }
      ];
      
      const grid = rngService.generateGrid(symbols);
      
      expect(grid).toHaveLength(3);
      expect(grid[0]).toHaveLength(3);
      expect(grid[1]).toHaveLength(3);
      expect(grid[2]).toHaveLength(3);
      
      // All symbols should be from our provided list
      const validSymbols = new Set(symbols.map(s => s.symbol));
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(validSymbols.has(grid[row][col])).toBe(true);
        }
      }
    });

    it('should respect symbol weights in grid generation', () => {
      const symbols = [
        { symbol: 'A', weight: 1 },
        { symbol: 'B', weight: 0 } // This symbol should rarely appear
      ];
      
      const grid = rngService.generateGrid(symbols);
      
      // Count symbol frequencies
      let countA = 0;
      let countB = 0;
      
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (grid[row][col] === 'A') countA++;
          if (grid[row][col] === 'B') countB++;
        }
      }
      
      // A should appear much more often than B due to weight difference
      expect(countA).toBeGreaterThan(countB);
    });
  });

  describe('verifyRandomnessDistribution', () => {
    it('should verify good randomness', () => {
      const values: number[] = [];
      // Generate values with good randomness
      for (let i = 0; i < 1000; i++) {
        values.push(Math.floor(rngService.generateRandomFloat() * 10));
      }
      
      const expectedFrequency = values.length / 10;
      const result = rngService.verifyRandomnessDistribution(values, expectedFrequency);
      
      // With good randomness, this should return true
      expect(result).toBe(true);
    });

    it('should detect poor randomness', () => {
      const values: number[] = [];
      // Generate values with poor randomness (all the same)
      for (let i = 0; i < 1000; i++) {
        values.push(5);
      }
      
      const expectedFrequency = values.length / 10;
      const result = rngService.verifyRandomnessDistribution(values, expectedFrequency);
      
      // With poor randomness, this should return false
      expect(result).toBe(false);
    });
  });
});

describe('RNG Integration Tests', () => {
  let rngService: SlotRNGService;

  beforeEach(() => {
    rngService = new SlotRNGService();
  });

  it('should generate reproducible results with same seed sequence', () => {
    // Generate multiple seeds
    const seed1 = rngService.generateSeed();
    const seed2 = rngService.generateSeed();
    const seed3 = rngService.generateSeed();
    
    // Create new service and generate same sequence
    const rngService2 = new SlotRNGService();
    const seed1_2 = rngService2.generateSeed();
    const seed2_2 = rngService2.generateSeed();
    const seed3_2 = rngService2.generateSeed();
    
    // Seeds should follow same pattern (sequence counter)
    expect(seed1.sequence).toBe(1);
    expect(seed2.sequence).toBe(2);
    expect(seed3.sequence).toBe(3);
    expect(seed1_2.sequence).toBe(1);
    expect(seed2_2.sequence).toBe(2);
    expect(seed3_2.sequence).toBe(3);
  });
});