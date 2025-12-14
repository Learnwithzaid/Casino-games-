import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const betSchema = z.object({
  gameId: z.string().uuid(),
  betAmount: z.number().positive().min(0.01)
});

const historyQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  gameId: z.string().uuid().optional(),
  outcome: z.enum(['WIN', 'LOSS', 'BONUS']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export async function slotEngineRoutes(app: FastifyInstance) {
  const prisma = app.prisma as PrismaClient;

  // GET /api/game/history - Enhanced history endpoint
  app.get('/api/game/history', async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const queryParams = historyQuerySchema.parse(request.query);
      const page = parseInt(queryParams.page || '1');
      const limit = Math.min(parseInt(queryParams.limit || '20'), 100); // Cap at 100

      const options = {
        page,
        limit,
        gameId: queryParams.gameId,
        outcome: queryParams.outcome,
        startDate: queryParams.startDate ? new Date(queryParams.startDate) : undefined,
        endDate: queryParams.endDate ? new Date(queryParams.endDate) : undefined
      };

      const bettingService = app.services.bettingService;
      const result = await bettingService.getGameHistory(userId, options);

      return reply.json({
        success: true,
        ...result
      });

    } catch (error) {
      app.log.error('Error fetching game history:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to fetch game history'
      });
    }
  });

  // GET /api/game/round/:id - Get specific game round for replay
  app.get('/api/game/round/:id', async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const { id } = request.params as { id: string };

      const bettingService = app.services.bettingService;
      const gameRound = await bettingService.getGameRound(id, userId);

      return reply.json({
        success: true,
        data: gameRound
      });

    } catch (error) {
      app.log.error('Error fetching game round:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch game round';
      
      if (errorMessage === 'Game round not found') {
        return reply.status(404).json({
          success: false,
          error: 'Game round not found'
        });
      }

      return reply.status(500).json({
        success: false,
        error: 'Failed to fetch game round'
      });
    }
  });

  // GET /api/game/stats - Get user's RTP statistics
  app.get('/api/game/stats', async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const query = request.query as any;
      const gameId = query.gameId;
      const days = query.days ? parseInt(query.days) : undefined;

      const bettingService = app.services.bettingService;
      const stats = await bettingService.getUserRTPStats(userId, gameId, days);

      return reply.json({
        success: true,
        data: stats
      });

    } catch (error) {
      app.log.error('Error fetching user stats:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to fetch user stats'
      });
    }
  });

  // POST /api/game/bet - Main betting endpoint
  app.post('/api/game/bet', async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const { gameId, betAmount } = betSchema.parse(request.body);

      // Check rate limiting (basic implementation)
      const rateLimitKey = `bet:${userId}`;
      // In a real implementation, you'd use Redis or similar for distributed rate limiting
      // For now, we'll skip detailed rate limiting

      const bettingService = app.services.bettingService;
      const result = await bettingService.placeBet({
        gameId,
        betAmount,
        userId
      });

      if (!result.success) {
        return reply.status(400).json({
          success: false,
          error: result.error || 'Bet placement failed',
          data: {
            balanceBefore: result.balanceBefore,
            balanceAfter: result.balanceAfter
          }
        });
      }

      return reply.json({
        success: true,
        data: {
          gameRoundId: result.gameRoundId,
          grid: result.grid,
          winningLines: result.winningLines,
          totalPayout: result.totalPayout,
          outcome: result.outcome,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter,
          rtpSnapshot: result.rtpSnapshot,
          rngSeed: result.rngSeed
        }
      });

    } catch (error) {
      app.log.error('Error placing bet:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to place bet';
      
      if (errorMessage === 'Insufficient balance') {
        return reply.status(400).json({
          success: false,
          error: 'Insufficient balance'
        });
      }

      if (errorMessage.includes('below minimum') || errorMessage.includes('exceeds maximum')) {
        return reply.status(400).json({
          success: false,
          error: errorMessage
        });
      }

      return reply.status(500).json({
        success: false,
        error: 'Failed to place bet'
      });
    }
  });

  // GET /api/game/config/:gameId - Get game configuration (for debugging/monitoring)
  app.get('/api/game/config/:gameId', async (request, reply) => {
    try {
      // Only allow admin users to access this endpoint
      const userId = request.user?.userId;
      const userRole = request.user?.role;
      
      if (!userId || userRole !== 'admin') {
        return reply.status(403).json({
          success: false,
          error: 'Forbidden'
        });
      }

      const { gameId } = request.params as { gameId: string };

      const slotEngineService = app.services.slotEngineService;
      const config = await slotEngineService.loadGameConfig(gameId);

      return reply.json({
        success: true,
        data: {
          game: {
            id: config.game.id,
            name: config.game.name,
            type: config.game.type,
            rtp: config.game.rtp,
            minBet: config.game.minBet,
            maxBet: config.game.maxBet,
            maxWin: config.game.maxWin,
            isActive: config.game.isActive
          },
          symbols: config.symbols.map(s => ({
            symbol: s.symbol,
            multiplier: s.multiplier,
            isScatter: s.isScatter,
            isWild: s.isWild,
            isBonus: s.isBonus,
            weight: s.weight
          })),
          paylines: config.paylines.map(p => ({
            name: p.name,
            pattern: JSON.parse(p.pattern),
            isActive: p.isActive
          })),
          cacheStats: slotEngineService.getCacheStats()
        }
      });

    } catch (error) {
      app.log.error('Error fetching game config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch game config';
      
      if (errorMessage === 'Game not found') {
        return reply.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }

      return reply.status(500).json({
        success: false,
        error: 'Failed to fetch game config'
      });
    }
  });
}