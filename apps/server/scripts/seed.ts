import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test game
  const game = await prisma.game.upsert({
    where: { name: 'Classic Fruit Slot' },
    update: {},
    create: {
      name: 'Classic Fruit Slot',
      slug: 'classic-fruit-slot',
      provider: 'Internal',
      type: 'SLOT',
      rtp: 95.0,
      isActive: true,
      minBet: 0.01,
      maxBet: 100.0,
      maxWin: 10000.0
    }
  });

  console.log('Created game:', game.name);

  // Create game symbols
  const symbols = [
    {
      gameId: game.id,
      symbol: 'CHERRY',
      multiplier: 2.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 0,
      weight: 15
    },
    {
      gameId: game.id,
      symbol: 'LEMON',
      multiplier: 2.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 1,
      weight: 15
    },
    {
      gameId: game.id,
      symbol: 'ORANGE',
      multiplier: 3.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 2,
      weight: 12
    },
    {
      gameId: game.id,
      symbol: 'PLUM',
      multiplier: 3.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 3,
      weight: 12
    },
    {
      gameId: game.id,
      symbol: 'GRAPE',
      multiplier: 4.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 4,
      weight: 10
    },
    {
      gameId: game.id,
      symbol: 'BELL',
      multiplier: 5.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 5,
      weight: 8
    },
    {
      gameId: game.id,
      symbol: 'BAR',
      multiplier: 6.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 6,
      weight: 6
    },
    {
      gameId: game.id,
      symbol: 'SEVEN',
      multiplier: 10.0,
      isScatter: false,
      isWild: false,
      isBonus: false,
      sortOrder: 7,
      weight: 4
    },
    {
      gameId: game.id,
      symbol: 'WILD',
      multiplier: 0, // Wild has no direct multiplier
      isScatter: false,
      isWild: true,
      isBonus: false,
      sortOrder: 8,
      weight: 3
    }
  ];

  await prisma.gameSymbol.deleteMany({ where: { gameId: game.id } });
  const createdSymbols = await prisma.gameSymbol.createMany({
    data: symbols
  });

  console.log(`Created ${createdSymbols.count} game symbols`);

  // Create paylines
  const paylines = [
    {
      gameId: game.id,
      name: 'Horizontal Top',
      pattern: JSON.stringify([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 }
      ]),
      isActive: true
    },
    {
      gameId: game.id,
      name: 'Horizontal Middle',
      pattern: JSON.stringify([
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 }
      ]),
      isActive: true
    },
    {
      gameId: game.id,
      name: 'Horizontal Bottom',
      pattern: JSON.stringify([
        { row: 2, col: 0 },
        { row: 2, col: 1 },
        { row: 2, col: 2 }
      ]),
      isActive: true
    },
    {
      gameId: game.id,
      name: 'Diagonal Left',
      pattern: JSON.stringify([
        { row: 0, col: 0 },
        { row: 1, col: 1 },
        { row: 2, col: 2 }
      ]),
      isActive: true
    },
    {
      gameId: game.id,
      name: 'Diagonal Right',
      pattern: JSON.stringify([
        { row: 0, col: 2 },
        { row: 1, col: 1 },
        { row: 2, col: 0 }
      ]),
      isActive: true
    }
  ];

  await prisma.payline.deleteMany({ where: { gameId: game.id } });
  const createdPaylines = await prisma.payline.createMany({
    data: paylines
  });

  console.log(`Created ${createdPaylines.count} paylines`);

  // Create a test user
  const user = await prisma.user.upsert({
    where: { id: 'test-user-1' },
    update: {},
    create: {
      id: 'test-user-1',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashed_password', // In real app, this would be properly hashed
      role: 'PLAYER',
      status: 'ACTIVE',
      isEmailVerified: true,
      createdAt: new Date()
    }
  });

  console.log('Created test user:', user.username);

  // Create a test wallet
  const wallet = await prisma.walletAccount.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      balance: 1000.0, // Start with 1000 for testing
      currency: 'USD'
    }
  });

  console.log('Created test wallet with balance:', wallet.balance);

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });