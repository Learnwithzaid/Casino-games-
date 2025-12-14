import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const adminPasswordHash = await bcrypt.hash('admin123!', 12);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@gamingapi.com',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      isTwoFactorEnabled: false,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create sample player user
  const playerPasswordHash = await bcrypt.hash('player123!', 12);
  
  const playerUser = await prisma.user.create({
    data: {
      email: 'player@gamingapi.com',
      username: 'player',
      passwordHash: playerPasswordHash,
      role: 'PLAYER',
      status: 'ACTIVE',
      isEmailVerified: true,
      isTwoFactorEnabled: false,
    },
  });

  console.log('✅ Created player user:', playerUser.email);

  // Create wallet for admin user
  const adminWallet = await prisma.wallet.create({
    data: {
      userId: adminUser.id,
      balance: 1000.00,
      currency: 'USD',
      verificationLevel: 3,
    },
  });

  console.log('✅ Created admin wallet with $1000.00');

  // Create wallet for player user
  const playerWallet = await prisma.wallet.create({
    data: {
      userId: playerUser.id,
      balance: 250.50,
      currency: 'USD',
      verificationLevel: 2,
    },
  });

  console.log('✅ Created player wallet with $250.50');

  // Create sample slot game
  const slotGame = await prisma.game.create({
    data: {
      name: 'Lucky Sevens',
      slug: 'lucky-sevens',
      provider: 'Internal Games',
      type: 'SLOT',
      rtp: 96.50,
      minBet: 0.10,
      maxBet: 100.00,
      maxWin: 5000.00,
    },
  });

  console.log('✅ Created slot game:', slotGame.name);

  // Create game symbols for the slot game
  const symbols = [
    { symbol: '7', multiplier: 10.00, isScatter: false, isWild: false, isBonus: false, sortOrder: 1 },
    { symbol: 'BAR', multiplier: 5.00, isScatter: false, isWild: false, isBonus: false, sortOrder: 2 },
    { symbol: 'CHERRY', multiplier: 3.00, isScatter: false, isWild: false, isBonus: false, sortOrder: 3 },
    { symbol: 'LEMON', multiplier: 2.00, isScatter: false, isWild: false, isBonus: false, sortOrder: 4 },
    { symbol: 'ORANGE', multiplier: 2.00, isScatter: false, isWild: false, isBonus: false, sortOrder: 5 },
    { symbol: 'PLUM', multiplier: 1.50, isScatter: false, isWild: false, isBonus: false, sortOrder: 6 },
    { symbol: 'BELL', multiplier: 1.50, isScatter: false, isWild: false, isBonus: false, sortOrder: 7 },
    { symbol: 'WILD', multiplier: 2.00, isScatter: false, isWild: true, isBonus: false, sortOrder: 8 },
    { symbol: 'SCATTER', multiplier: 0.00, isScatter: true, isWild: false, isBonus: true, sortOrder: 9 },
  ];

  for (const symbolData of symbols) {
    await prisma.gameSymbol.create({
      data: {
        gameId: slotGame.id,
        ...symbolData,
      },
    });
  }

  console.log('✅ Created game symbols for Lucky Sevens');

  // Create paylines for the slot game
  const paylines = [
    {
      name: 'Horizontal Top',
      pattern: JSON.stringify([[0,0], [0,1], [0,2], [0,3], [0,4]]),
    },
    {
      name: 'Horizontal Middle',
      pattern: JSON.stringify([[1,0], [1,1], [1,2], [1,3], [1,4]]),
    },
    {
      name: 'Horizontal Bottom',
      pattern: JSON.stringify([[2,0], [2,1], [2,2], [2,3], [2,4]]),
    },
    {
      name: 'Diagonal Top Left',
      pattern: JSON.stringify([[0,0], [1,1], [2,2], [1,3], [0,4]]),
    },
    {
      name: 'Diagonal Bottom Left',
      pattern: JSON.stringify([[2,0], [1,1], [0,2], [1,3], [2,4]]),
    },
  ];

  for (const paylineData of paylines) {
    await prisma.payline.create({
      data: {
        gameId: slotGame.id,
        ...paylineData,
      },
    });
  }

  console.log('✅ Created paylines for Lucky Sevens');

  // Create game settings
  await prisma.gameSetting.create({
    data: {
      gameId: slotGame.id,
      rtp: 96.50,
      volatility: 'MEDIUM',
      hitFrequency: 30.00,
      freeSpinsEnabled: true,
      bonusRounds: true,
      multiplierMax: 10.00,
    },
  });

  console.log('✅ Created game settings for Lucky Sevens');

  // Create system settings
  const systemSettings = [
    {
      key: 'PLATFORM_NAME',
      value: JSON.stringify('Gaming API Platform'),
      description: 'Name of the gaming platform',
      category: 'GENERAL',
      isPublic: true,
    },
    {
      key: 'MIN_DEPOSIT_AMOUNT',
      value: JSON.stringify(10.00),
      description: 'Minimum deposit amount in USD',
      category: 'PAYMENT',
      isPublic: false,
    },
    {
      key: 'MAX_DEPOSIT_AMOUNT',
      value: JSON.stringify(10000.00),
      description: 'Maximum deposit amount in USD',
      category: 'PAYMENT',
      isPublic: false,
    },
    {
      key: 'WITHDRAWAL_FEE_PERCENTAGE',
      value: JSON.stringify(2.5),
      description: 'Withdrawal fee percentage',
      category: 'PAYMENT',
      isPublic: false,
    },
    {
      key: 'KYC_REQUIRED_AMOUNT',
      value: JSON.stringify(1000.00),
      description: 'KYC verification required for withdrawals above this amount',
      category: 'COMPLIANCE',
      isPublic: false,
    },
    {
      key: 'SESSION_TIMEOUT_MINUTES',
      value: JSON.stringify(30),
      description: 'Session timeout in minutes',
      category: 'SECURITY',
      isPublic: false,
    },
    {
      key: 'MAX_LOGIN_ATTEMPTS',
      value: JSON.stringify(5),
      description: 'Maximum login attempts before account lockout',
      category: 'SECURITY',
      isPublic: false,
    },
    {
      key: 'BONUS_WAGERING_REQUIREMENT',
      value: JSON.stringify(35),
      description: 'Bonus wagering requirement multiplier',
      category: 'BONUS',
      isPublic: true,
    },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.create({
      data: setting,
    });
  }

  console.log('✅ Created system settings');

  // Create sample transactions for the player
  const sampleTransactions = [
    {
      walletId: playerWallet.id,
      type: 'DEPOSIT',
      amount: 100.00,
      status: 'COMPLETED',
      referenceId: 'DEP001',
      externalId: 'PMT_123456',
    },
    {
      walletId: playerWallet.id,
      type: 'BET',
      amount: -5.00,
      status: 'COMPLETED',
      referenceId: 'GAME_001_ROUND_1',
    },
    {
      walletId: playerWallet.id,
      type: 'WIN',
      amount: 15.50,
      status: 'COMPLETED',
      referenceId: 'GAME_001_ROUND_1',
    },
    {
      walletId: playerWallet.id,
      type: 'BONUS',
      amount: 50.00,
      status: 'COMPLETED',
      referenceId: 'WELCOME_BONUS',
    },
  ];

  for (const transactionData of sampleTransactions) {
    await prisma.transaction.create({
      data: {
        ...transactionData,
        currency: 'USD',
        processedAt: new Date(),
      },
    });
  }

  console.log('✅ Created sample transactions');

  // Create audit logs
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'USER_CREATED',
      resource: 'User',
      resourceId: playerUser.id,
      newValues: JSON.stringify({
        email: playerUser.email,
        role: playerUser.role,
      }),
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Seed Script)',
    },
  });

  console.log('✅ Created audit logs');

  // Create sample payment webhook
  await prisma.paymentWebhook.create({
    data: {
      paymentId: 'PMT_123456',
      provider: 'Stripe',
      event: 'payment_intent.succeeded',
      status: 'SUCCESS',
      payload: JSON.stringify({
        id: 'pi_123456789',
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
      }),
      processedAt: new Date(),
    },
  });

  console.log('✅ Created payment webhook');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
