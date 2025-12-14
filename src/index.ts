import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'database connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'database error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Example API routes demonstrating the schema

// Get all users with their wallets
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        wallet: true,
      },
      where: {
        role: 'PLAYER', // Only show players, not admins
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        wallet: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 10, // Last 10 transactions
            }
          }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Last 5 audit logs
        }
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all games
app.get('/api/games', async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      include: {
        symbols: {
          orderBy: { sortOrder: 'asc' }
        },
        paylines: {
          where: { isActive: true }
        },
        gameSettings: true,
      },
      where: {
        isActive: true,
      },
    });
    res.json(games);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch games',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get game by slug
app.get('/api/games/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const game = await prisma.game.findUnique({
      where: { slug },
      include: {
        symbols: {
          orderBy: { sortOrder: 'asc' }
        },
        paylines: {
          orderBy: { name: 'asc' }
        },
        gameSettings: true,
      },
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get system settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        isPublic: true,
      },
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ],
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get analytics data (example of complex queries)
app.get('/api/analytics/users', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const userStats = await prisma.user.groupBy({
      by: ['status'],
      _count: true,
    });

    const recentUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const activeUsers = await prisma.user.count({
      where: {
        status: 'ACTIVE',
      },
    });

    res.json({
      totalUsers: await prisma.user.count(),
      activeUsers,
      recentUsers,
      usersByStatus: userStats,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch user analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get transaction analytics
app.get('/api/analytics/transactions', async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactionsByType = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const todayVolume = await prisma.transaction.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startOfDay,
        },
      },
      _sum: {
        amount: true,
      },
    });

    res.json({
      todayVolume: todayVolume._sum.amount || 0,
      transactionsByType,
      totalTransactions: await prisma.transaction.count({
        where: {
          status: 'COMPLETED',
        },
      }),
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch transaction analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gaming API server running on port ${PORT}`);
  console.log(`📊 Database schema ready with Prisma ORM`);
  console.log(`🔍 Health checks available at:`);
  console.log(`   - GET /health`);
  console.log(`   - GET /health/db`);
  console.log(`📚 API examples:`);
  console.log(`   - GET /api/users`);
  console.log(`   - GET /api/games`);
  console.log(`   - GET /api/settings`);
  console.log(`   - GET /api/analytics/users`);
  console.log(`   - GET /api/analytics/transactions`);
});

export default app;
