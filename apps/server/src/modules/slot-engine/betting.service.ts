import { PrismaClient, WalletEntryType } from '@prisma/client';
import type { Payline } from '@prisma/client';
import type { SlotEngineService } from './slot-engine.service.js';
import type { WalletService } from '../wallet/wallet.service.js';

export interface BetRequest {
  gameId: string;
  betAmount: number;
  userId: string;
}

export interface BetResult {
  success: boolean;
  gameRoundId: string;
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
  balanceBefore: number;
  balanceAfter: number;
  rtpSnapshot: number;
  rngSeed: string;
  error?: string;
}

export class BettingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly slotEngine: SlotEngineService,
    private readonly walletService: WalletService
  ) {}

  /**
   * Process a complete bet transaction
   */
  async placeBet(request: BetRequest): Promise<BetResult> {
    const { gameId, betAmount, userId } = request;

    try {
      // Validate inputs
      if (!gameId || !betAmount || !userId) {
        throw new Error('Missing required fields: gameId, betAmount, userId');
      }

      if (betAmount <= 0) {
        throw new Error('Bet amount must be positive');
      }

      // Start database transaction
      return await this.prisma.$transaction(async (tx) => {
        // Get user's wallet
        const wallet = await tx.walletAccount.findUnique({
          where: { userId }
        });

        if (!wallet) {
          throw new Error(`Wallet not found for user: ${userId}`);
        }

        const balanceBefore = Number(wallet.balance);

        // Check if user has sufficient balance
        if (balanceBefore < betAmount) {
          throw new Error('Insufficient balance');
        }

        // Validate bet amount against game limits
        const isValidBet = await this.slotEngine.validateBet(gameId, betAmount);
        if (!isValidBet) {
          throw new Error('Invalid bet amount for this game');
        }

        // Generate spin result
        const spinResult = await this.slotEngine.generateSpin(gameId, betAmount);

        // Create game round record
        const gameRound = await tx.gameRound.create({
          data: {
            gameId,
            userId,
            betAmount: betAmount.toString(),
            winAmount: spinResult.totalPayout.toString(),
            status: 'COMPLETED',
            grid: JSON.stringify(spinResult.grid),
            winningLines: JSON.stringify(spinResult.winningLines),
            rtpSnapshot: this.slotEngine.calculateRTP(betAmount, spinResult.totalPayout)
          }
        });

        // Create game result record
        await tx.gameResult.create({
          data: {
            gameRoundId: gameRound.id,
            outcome: spinResult.outcome,
            payout: spinResult.totalPayout.toString(),
            multiplier: spinResult.multiplier,
            rngSeed: spinResult.rngSeed,
            bonusTriggered: spinResult.outcome === 'BONUS'
          }
        });

        // Debit the wallet for the bet
        await tx.walletLedgerEntry.create({
          data: {
            walletId: wallet.id,
            type: WalletEntryType.DEBIT,
            amount: betAmount.toString(),
            referenceType: 'GAME_ROUND',
            referenceId: gameRound.id
          }
        });

        // Credit winnings if any
        const netWin = spinResult.totalPayout - betAmount;
        if (netWin > 0) {
          await tx.walletLedgerEntry.create({
            data: {
              walletId: wallet.id,
              type: WalletEntryType.CREDIT,
              amount: netWin.toString(),
              referenceType: 'GAME_ROUND',
              referenceId: gameRound.id
            }
          });
        }

        // Update wallet balance
        const newBalance = balanceBefore - betAmount + spinResult.totalPayout;
        await tx.walletAccount.update({
          where: { id: wallet.id },
          data: { balance: newBalance.toString() }
        });

        // Create RTP snapshot
        await tx.rTPSnapshot.create({
          data: {
            gameId,
            userId,
            betAmount: betAmount.toString(),
            winAmount: spinResult.totalPayout.toString(),
            rtp: this.slotEngine.calculateRTP(betAmount, spinResult.totalPayout)
          }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            actorUserId: userId,
            action: 'BET_PLACED',
            entityType: 'GameRound',
            entityId: gameRound.id,
            meta: {
              gameId,
              betAmount: betAmount.toString(),
              winAmount: spinResult.totalPayout.toString(),
              outcome: spinResult.outcome,
              rngSeed: spinResult.rngSeed
            }
          }
        });

        return {
          success: true,
          gameRoundId: gameRound.id,
          grid: spinResult.grid,
          winningLines: spinResult.winningLines,
          totalPayout: spinResult.totalPayout,
          outcome: spinResult.outcome,
          balanceBefore,
          balanceAfter: newBalance,
          rtpSnapshot: this.slotEngine.calculateRTP(betAmount, spinResult.totalPayout),
          rngSeed: spinResult.rngSeed
        };
      });

    } catch (error) {
      return {
        success: false,
        gameRoundId: '',
        grid: [],
        winningLines: [],
        totalPayout: 0,
        outcome: 'LOSS',
        balanceBefore: 0,
        balanceAfter: 0,
        rtpSnapshot: 0,
        rngSeed: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get game history for a user
   */
  async getGameHistory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      gameId?: string;
      outcome?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const {
      page = 1,
      limit = 20,
      gameId,
      outcome,
      startDate,
      endDate
    } = options;

    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (gameId) where.gameId = gameId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [gameRounds, total] = await Promise.all([
      this.prisma.gameRound.findMany({
        where,
        include: {
          game: { select: { name: true, type: true } },
          result: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.gameRound.count({ where })
    ]);

    // Process results for response
    const processedResults = gameRounds.map(round => ({
      id: round.id,
      gameId: round.gameId,
      gameName: round.game?.name,
      gameType: round.game?.type,
      betAmount: Number(round.betAmount),
      winAmount: Number(round.winAmount),
      status: round.status,
      outcome: round.result?.outcome,
      multiplier: round.result?.multiplier || 1,
      rtpSnapshot: round.rtpSnapshot,
      grid: JSON.parse(round.grid),
      winningLines: JSON.parse(round.winningLines),
      createdAt: round.createdAt
    }));

    return {
      data: processedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a specific game round for replay
   */
  async getGameRound(gameRoundId: string, userId?: string) {
    const where: any = { id: gameRoundId };
    if (userId) where.userId = userId;

    const gameRound = await this.prisma.gameRound.findUnique({
      where,
      include: {
        game: { select: { name: true, type: true } },
        result: true
      }
    });

    if (!gameRound) {
      throw new Error('Game round not found');
    }

    return {
      id: gameRound.id,
      gameId: gameRound.gameId,
      gameName: gameRound.game?.name,
      userId: gameRound.userId,
      betAmount: Number(gameRound.betAmount),
      winAmount: Number(gameRound.winAmount),
      status: gameRound.status,
      outcome: gameRound.result?.outcome,
      multiplier: gameRound.result?.multiplier || 1,
      rtpSnapshot: gameRound.rtpSnapshot,
      grid: JSON.parse(gameRound.grid),
      winningLines: JSON.parse(gameRound.winningLines),
      rngSeed: gameRound.result?.rngSeed,
      createdAt: gameRound.createdAt
    };
  }

  /**
   * Calculate overall RTP statistics for a user
   */
  async getUserRTPStats(userId: string, gameId?: string, days?: number) {
    const where: any = { userId };
    
    if (gameId) {
      where.gameId = gameId;
    }
    
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      where.createdAt = { gte: startDate };
    }

    const snapshots = await this.prisma.rTPSnapshot.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    if (snapshots.length === 0) {
      return {
        totalBets: 0,
        totalWins: 0,
        totalNetLoss: 0,
        averageRTP: 0,
        totalRounds: 0
      };
    }

    const totalBets = snapshots.reduce((sum, s) => sum + Number(s.betAmount), 0);
    const totalWins = snapshots.reduce((sum, s) => sum + Number(s.winAmount), 0);
    const totalNetLoss = totalBets - totalWins;
    const averageRTP = snapshots.reduce((sum, s) => sum + s.rtp, 0) / snapshots.length;

    return {
      totalBets,
      totalWins,
      totalNetLoss,
      averageRTP,
      totalRounds: snapshots.length
    };
  }
}