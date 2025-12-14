import { PrismaClient, type Game, type GameSymbol, type Payline } from '@prisma/client';
import { SlotRNGService } from './rng.service.js';

export interface SlotGrid {
  symbols: string[][];
  winningLines: Array<{
    payline: Payline;
    matches: number;
    symbol: string;
    multiplier: number;
    positions: Array<{ row: number; col: number }>;
  }>;
  totalPayout: number;
  isWin: boolean;
}

export interface GameConfig {
  game: Game;
  symbols: GameSymbol[];
  paylines: Payline[];
  rtpTarget: number;
  minBet: number;
  maxBet: number;
  maxWin: number;
}

export interface SpinResult {
  grid: string[][];
  winningLines: Array<{
    payline: Payline;
    matches: number;
    symbol: string;
    multiplier: number;
    positions: Array<{ row: number; col: number }>;
  }>;
  totalPayout: number;
  outcome: 'WIN' | 'LOSS' | 'BONUS';
  multiplier: number;
  rngSeed: string;
}

export class SlotEngineService {
  private configCache = new Map<string, GameConfig>();
  private rngService = new SlotRNGService();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Load and cache game configuration
   */
  async loadGameConfig(gameId: string): Promise<GameConfig> {
    // Check cache first
    if (this.configCache.has(gameId)) {
      return this.configCache.get(gameId)!;
    }

    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        symbols: { orderBy: { sortOrder: 'asc' } },
        paylines: { where: { isActive: true }, orderBy: { name: 'asc' } }
      }
    });

    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    if (!game.isActive) {
      throw new Error(`Game is not active: ${gameId}`);
    }

    const config: GameConfig = {
      game,
      symbols: game.symbols,
      paylines: game.paylines,
      rtpTarget: game.rtp,
      minBet: game.minBet,
      maxBet: game.maxBet,
      maxWin: game.maxWin
    };

    // Cache the configuration
    this.configCache.set(gameId, config);
    
    return config;
  }

  /**
   * Generate a new spin result
   */
  async generateSpin(gameId: string, betAmount: number): Promise<SpinResult> {
    const config = await this.loadGameConfig(gameId);
    
    // Validate bet amount
    if (betAmount < config.minBet) {
      throw new Error(`Bet amount ${betAmount} is below minimum ${config.minBet}`);
    }
    
    if (betAmount > config.maxBet) {
      throw new Error(`Bet amount ${betAmount} exceeds maximum ${config.maxBet}`);
    }

    // Generate the grid using weighted RNG
    const symbolWeights = config.symbols.map(s => s.weight || 1);
    const symbols = config.symbols.map(s => ({ symbol: s.symbol, weight: s.weight || 1 }));
    
    const grid = this.rngService.generateGrid(symbols);
    const rngSeed = this.rngService.generateSeed().seed;

    // Evaluate winning lines
    const winningLines = this.evaluateWinningLines(grid, config);

    // Calculate total payout
    const totalPayout = this.calculatePayout(winningLines, betAmount);

    // Determine outcome
    let outcome: 'WIN' | 'LOSS' | 'BONUS' = 'LOSS';
    if (winningLines.length > 0) {
      outcome = totalPayout > betAmount * 10 ? 'BONUS' : 'WIN';
    }

    return {
      grid,
      winningLines,
      totalPayout,
      outcome,
      multiplier: totalPayout / betAmount,
      rngSeed
    };
  }

  /**
   * Evaluate winning lines in the grid
   */
  private evaluateWinningLines(
    grid: string[][], 
    config: GameConfig
  ): Array<{
    payline: Payline;
    matches: number;
    symbol: string;
    multiplier: number;
    positions: Array<{ row: number; col: number }>;
  }> {
    const winningLines = [];

    for (const payline of config.paylines) {
      try {
        const positions = JSON.parse(payline.pattern) as Array<{ row: number; col: number }>;
        const symbols = positions.map(pos => grid[pos.row][pos.col]);
        
        // Check for matches starting from left
        const firstSymbol = symbols[0];
        let matchCount = 1;
        const matchedPositions = [positions[0]];

        for (let i = 1; i < symbols.length; i++) {
          const currentSymbol = symbols[i];
          
          // Check for wild symbol matches
          const isMatch = currentSymbol === firstSymbol || 
                         this.isWildSymbol(currentSymbol, config.symbols);
          
          if (isMatch) {
            matchCount++;
            matchedPositions.push(positions[i]);
          } else {
            break;
          }
        }

        // Only consider if we have at least 3 matches
        if (matchCount >= 3) {
          const symbolData = config.symbols.find(s => s.symbol === firstSymbol);
          const multiplier = symbolData?.multiplier || 1.0;

          winningLines.push({
            payline,
            matches: matchCount,
            symbol: firstSymbol,
            multiplier,
            positions: matchedPositions
          });
        }
      } catch (error) {
        // Log invalid payline pattern and continue
        console.error(`Invalid payline pattern for payline ${payline.id}:`, error);
      }
    }

    return winningLines;
  }

  /**
   * Check if a symbol is a wild symbol
   */
  private isWildSymbol(symbol: string, symbols: GameSymbol[]): boolean {
    const symbolData = symbols.find(s => s.symbol === symbol);
    return symbolData?.isWild || false;
  }

  /**
   * Calculate total payout based on winning lines
   */
  private calculatePayout(
    winningLines: Array<{
      payline: Payline;
      matches: number;
      symbol: string;
      multiplier: number;
      positions: Array<{ row: number; col: number }>;
    }>,
    betAmount: number
  ): number {
    let totalPayout = 0;

    for (const line of winningLines) {
      // Base payout calculation (simplified)
      const basePayout = betAmount * line.multiplier * (line.matches - 2);
      
      // Bonus for more matches
      const bonusMultiplier = line.matches >= 5 ? 2.0 : line.matches === 4 ? 1.5 : 1.0;
      
      totalPayout += basePayout * bonusMultiplier;
    }

    return Math.floor(totalPayout);
  }

  /**
   * Validate bet amount against game limits
   */
  async validateBet(gameId: string, betAmount: number): Promise<boolean> {
    const config = await this.loadGameConfig(gameId);
    return betAmount >= config.minBet && betAmount <= config.maxBet;
  }

  /**
   * Calculate RTP for a spin
   */
  calculateRTP(betAmount: number, winAmount: number): number {
    if (betAmount === 0) return 0;
    return ((winAmount - betAmount) / betAmount) + 1; // Return as percentage
  }

  /**
   * Clear configuration cache
   */
  clearCache(gameId?: string): void {
    if (gameId) {
      this.configCache.delete(gameId);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * Get cached configuration stats
   */
  getCacheStats(): { size: number; games: string[] } {
    return {
      size: this.configCache.size,
      games: Array.from(this.configCache.keys())
    };
  }
}