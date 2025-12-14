import { Prisma, WalletEntryType } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { SlotSymbol, SpinResult, PayLine } from '@monorepo/shared';

export class SlotGameService {
  constructor(private readonly prisma: PrismaClient) {}

  // Symbol definitions matching client
  private readonly SYMBOLS: SlotSymbol[] = [
    { id: 'cherry', name: 'Cherry', emoji: '🍒', value: 2, rarity: 'common' },
    { id: 'lemon', name: 'Lemon', emoji: '🍋', value: 3, rarity: 'common' },
    { id: 'orange', name: 'Orange', emoji: '🍊', value: 4, rarity: 'common' },
    { id: 'plum', name: 'Plum', emoji: '🍇', value: 5, rarity: 'common' },
    { id: 'grape', name: 'Grape', emoji: '🍇', value: 6, rarity: 'common' },
    { id: 'bell', name: 'Bell', emoji: '🔔', value: 8, rarity: 'rare' },
    { id: 'seven', name: 'Seven', emoji: '7️⃣', value: 10, rarity: 'rare' },
    { id: 'star', name: 'Star', emoji: '⭐', value: 15, rarity: 'epic' },
    { id: 'diamond', name: 'Diamond', emoji: '💎', value: 25, rarity: 'legendary' },
    { id: 'gold', name: 'Gold', emoji: '🥇', value: 50, rarity: 'legendary' }
  ];

  // Payline definitions for 3x3 grid
  private readonly PAYLINES = [
    { id: 'horizontal-1', positions: [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }] },
    { id: 'horizontal-2', positions: [{ row: 1, column: 0 }, { row: 1, column: 1 }, { row: 1, column: 2 }] },
    { id: 'horizontal-3', positions: [{ row: 2, column: 0 }, { row: 2, column: 1 }, { row: 2, column: 2 }] },
    { id: 'vertical-1', positions: [{ row: 0, column: 0 }, { row: 1, column: 0 }, { row: 2, column: 0 }] },
    { id: 'vertical-2', positions: [{ row: 0, column: 1 }, { row: 1, column: 1 }, { row: 2, column: 1 }] },
    { id: 'vertical-3', positions: [{ row: 0, column: 2 }, { row: 1, column: 2 }, { row: 2, column: 2 }] },
    { id: 'diagonal-1', positions: [{ row: 0, column: 0 }, { row: 1, column: 1 }, { row: 2, column: 2 }] },
    { id: 'diagonal-2', positions: [{ row: 0, column: 2 }, { row: 1, column: 1 }, { row: 2, column: 0 }] }
  ];

  async spin(userId: string, betAmount: number): Promise<SpinResult> {
    // Generate random symbols for 3x3 grid
    const symbols: SlotSymbol[][] = [];
    for (let row = 0; row < 3; row++) {
      symbols[row] = [];
      for (let col = 0; col < 3; col++) {
        // Weight probabilities (common symbols more likely)
        const random = Math.random();
        let symbol: SlotSymbol;
        
        if (random < 0.4) symbol = this.SYMBOLS[0]; // Cherry (40%)
        else if (random < 0.7) symbol = this.SYMBOLS[1]; // Lemon (30%)
        else if (random < 0.85) symbol = this.SYMBOLS[2]; // Orange (15%)
        else if (random < 0.93) symbol = this.SYMBOLS[3]; // Plum (8%)
        else if (random < 0.97) symbol = this.SYMBOLS[4]; // Grape (4%)
        else if (random < 0.985) symbol = this.SYMBOLS[5]; // Bell (1.5%)
        else if (random < 0.995) symbol = this.SYMBOLS[6]; // Seven (1%)
        else if (random < 0.998) symbol = this.SYMBOLS[7]; // Star (0.3%)
        else if (random < 0.999) symbol = this.SYMBOLS[8]; // Diamond (0.1%)
        else symbol = this.SYMBOLS[9]; // Gold (0.1%)

        symbols[row][col] = symbol;
      }
    }

    // Check for winning paylines
    const winLines = this.checkWinLines(symbols, betAmount);
    const totalWinAmount = winLines.reduce((sum, line) => sum + line.winAmount, 0);
    const isWin = totalWinAmount > 0;

    // Create spin result
    const spinResult: SpinResult = {
      id: `spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      symbols,
      betAmount,
      winAmount: totalWinAmount,
      winLines,
      timestamp: new Date(),
      isWin
    };

    // Save spin result to database
    await this.saveSpinResult(spinResult);

    return spinResult;
  }

  private checkWinLines(symbols: SlotSymbol[][], betAmount: number): PayLine[] {
    const winLines: PayLine[] = [];

    for (const payline of this.PAYLINES) {
      const lineSymbols = payline.positions.map(pos => symbols[pos.row][pos.column]);
      const allSame = lineSymbols.every(symbol => symbol.id === lineSymbols[0].id);
      
      if (allSame) {
        const symbol = lineSymbols[0];
        let multiplier = 1;
        
        // Different multipliers based on rarity
        switch (symbol.rarity) {
          case 'common': multiplier = 2; break;
          case 'rare': multiplier = 5; break;
          case 'epic': multiplier = 10; break;
          case 'legendary': multiplier = 25; break;
        }

        // Bonus multiplier for certain symbols
        if (symbol.id === 'seven') multiplier *= 2;
        if (symbol.id === 'diamond') multiplier *= 3;
        if (symbol.id === 'gold') multiplier *= 5;

        const winAmount = betAmount * multiplier;

        winLines.push({
          id: payline.id,
          positions: payline.positions,
          multiplier,
          symbol,
          winAmount
        });
      }
    }

    return winLines;
  }

  private async saveSpinResult(spinResult: SpinResult): Promise<void> {
    // In a real implementation, you'd save this to a spins table
    // For now, we'll just log it
    console.log('Spin result saved:', spinResult.id);
  }

  async getSpinHistory(userId: string, page: number = 1, limit: number = 20) {
    // Mock data for now - in real implementation, fetch from database
    const mockSpins: SpinResult[] = [];
    
    for (let i = 0; i < Math.min(limit, 10); i++) {
      const symbols: SlotSymbol[][] = [];
      for (let row = 0; row < 3; row++) {
        symbols[row] = [];
        for (let col = 0; col < 3; col++) {
          symbols[row][col] = this.SYMBOLS[Math.floor(Math.random() * this.SYMBOLS.length)];
        }
      }
      
      const betAmount = [5, 10, 25, 50][Math.floor(Math.random() * 4)];
      const winLines = this.checkWinLines(symbols, betAmount);
      const winAmount = winLines.reduce((sum, line) => sum + line.winAmount, 0);
      
      mockSpins.push({
        id: `mock_spin_${i}`,
        userId,
        symbols,
        betAmount,
        winAmount,
        winLines,
        timestamp: new Date(Date.now() - i * 60000), // Each spin 1 minute apart
        isWin: winAmount > 0
      });
    }

    return {
      spins: mockSpins,
      pagination: {
        page,
        limit,
        total: 100, // Mock total
        totalPages: 10
      }
    };
  }

  getAvailableSymbols(): SlotSymbol[] {
    return this.SYMBOLS;
  }
}