import { randomBytes, createHash } from 'crypto';

export interface RNGSeed {
  seed: string;
  timestamp: number;
  sequence: number;
}

export class SlotRNGService {
  private seedCounter = 0;

  /**
   * Generate cryptographically secure random bytes
   */
  generateSecureRandom(bytes: number = 32): Buffer {
    return randomBytes(bytes);
  }

  /**
   * Generate a random float between 0 and 1
   */
  generateRandomFloat(): number {
    const buffer = this.generateSecureRandom(8);
    // Convert to a number between 0 and 1
    const uint64 = buffer.readBigUInt64BE(0);
    return Number(uint64) / Number(BigInt('0xFFFFFFFFFFFFFFFF'));
  }

  /**
   * Generate a random integer between min and max (inclusive)
   */
  generateRandomInt(min: number, max: number): number {
    if (min >= max) {
      throw new Error('Min must be less than max');
    }
    const range = max - min + 1;
    const buffer = this.generateSecureRandom(4);
    const uint32 = buffer.readUInt32BE(0);
    return min + (uint32 % range);
  }

  /**
   * Generate a weighted random selection from an array of items
   */
  generateWeightedRandom<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have the same length');
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = this.generateRandomFloat() * totalWeight;

    let currentWeight = 0;
    for (let i = 0; i < items.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        return items[i];
      }
    }

    // Fallback to last item
    return items[items.length - 1];
  }

  /**
   * Generate a new seed for reproducible randomness
   */
  generateSeed(): RNGSeed {
    const timestamp = Date.now();
    const sequence = ++this.seedCounter;
    const randomData = this.generateSecureRandom(16);
    
    const seedString = `${timestamp}-${sequence}-${randomData.toString('hex')}`;
    const seed = createHash('sha256').update(seedString).digest('hex');
    
    return {
      seed,
      timestamp,
      sequence
    };
  }

  /**
   * Generate a 3x3 grid of symbols based on weights
   */
  generateGrid(symbols: Array<{ symbol: string; weight: number }>): string[][] {
    const grid: string[][] = [];
    
    for (let row = 0; row < 3; row++) {
      grid[row] = [];
      for (let col = 0; col < 3; col++) {
        const selectedSymbol = this.generateWeightedRandom(
          symbols.map(s => s.symbol),
          symbols.map(s => s.weight)
        );
        grid[row][col] = selectedSymbol;
      }
    }
    
    return grid;
  }

  /**
   * Chi-square test for randomness verification
   */
  verifyRandomnessDistribution(
    values: number[], 
    expectedFrequency: number, 
    significance: number = 0.05
  ): boolean {
    const observed = new Map<number, number>();
    
    // Count frequencies
    values.forEach(value => {
      observed.set(value, (observed.get(value) || 0) + 1);
    });

    // Calculate chi-square statistic
    let chiSquare = 0;
    for (const [value, count] of observed) {
      const expected = expectedFrequency;
      chiSquare += Math.pow(count - expected, 2) / expected;
    }

    // Simple check: chi-square should not be too high for good randomness
    // For production, you'd want to use proper statistical distribution tables
    const criticalValue = values.length * 1.5; // Simplified threshold
    
    return chiSquare <= criticalValue;
  }
}