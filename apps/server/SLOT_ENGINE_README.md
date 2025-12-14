# Slot Engine API Implementation

This document describes the complete implementation of the slot machine engine and betting endpoint for the API service.

## Overview

The slot engine provides a cryptographically secure RNG-based slot machine with the following features:

- **Cryptographically Secure RNG**: Uses Node.js `crypto` module for secure randomness
- **3x3 Grid Slot Machine**: Traditional slot layout with symbol-based gameplay
- **5 Paylines**: Configurable winning line patterns
- **RTP Tracking**: Real-time return-to-player percentage monitoring
- **Atomic Wallet Integration**: Secure bet placement with atomic transactions
- **Audit Trail**: Complete logging for compliance and replay functionality

## Architecture

### Core Components

1. **SlotRNGService** (`/src/modules/slot-engine/rng.service.ts`)
   - Cryptographically secure random number generation
   - Weighted symbol selection for fair gameplay
   - Seed generation for reproducible results
   - Statistical verification of randomness

2. **SlotEngineService** (`/src/modules/slot-engine/slot-engine.service.ts`)
   - Game configuration management and caching
   - 3x3 grid generation with weighted symbols
   - Payline evaluation algorithm
   - Payout calculation with multipliers
   - RTP calculation and validation

3. **BettingService** (`/src/modules/slot-engine/betting.service.ts`)
   - Atomic bet processing with database transactions
   - Wallet integration (debit/credit)
   - Game round and result persistence
   - RTP snapshot tracking
   - Comprehensive audit logging

4. **API Routes** (`/src/modules/slot-engine/routes.ts`)
   - `POST /api/game/bet` - Main betting endpoint
   - `GET /api/game/history` - Enhanced history with filters
   - `GET /api/game/round/:id` - Game round replay
   - `GET /api/game/stats` - User RTP statistics
   - `GET /api/game/config/:gameId` - Admin game configuration

### Database Schema

New tables added to support slot engine:

- **Game**: Game configuration and metadata
- **GameSymbol**: Symbol definitions with weights and multipliers
- **Payline**: Winning line patterns and configurations
- **GameRound**: Individual spin records with grid and results
- **GameResult**: Spin outcomes with RNG seeds for audit
- **RTPSnapshot**: RTP tracking for analytics

## API Endpoints

### POST /api/game/bet

Place a bet and execute a spin.

**Request:**
```json
{
  "gameId": "uuid",
  "betAmount": 1.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameRoundId": "uuid",
    "grid": [["A", "B", "C"], ["D", "E", "F"], ["G", "H", "I"]],
    "winningLines": [
      {
        "payline": {"id": "uuid", "name": "Horizontal Top"},
        "matches": 3,
        "symbol": "A",
        "multiplier": 2.0,
        "positions": [{"row": 0, "col": 0}, {"row": 0, "col": 1}, {"row": 0, "col": 2}]
      }
    ],
    "totalPayout": 2.0,
    "outcome": "WIN",
    "balanceBefore": 100.0,
    "balanceAfter": 101.0,
    "rtpSnapshot": 2.0,
    "rngSeed": "abc123..."
  }
}
```

### GET /api/game/history

Retrieve user's game history with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (max: 100, default: 20)
- `gameId` (optional): Filter by game
- `outcome` (optional): Filter by outcome (WIN, LOSS, BONUS)
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

### GET /api/game/round/:id

Get specific game round for replay/audit.

### GET /api/game/stats

Get user's RTP statistics.

**Query Parameters:**
- `gameId` (optional): Filter by game
- `days` (optional): Filter by days back

## Testing

### Unit Tests

- **RNG Service Tests**: Statistical verification, randomness checks
- **Slot Engine Tests**: Payline evaluation, payout calculation, configuration
- **Betting Service Tests**: Transaction integrity, error handling, wallet integration

### Integration Tests

- End-to-end bet flow with wallet integration
- Concurrent bet handling
- Insufficient balance scenarios
- Database transaction rollback testing

### Running Tests

```bash
cd apps/server
npm test
```

## Security Features

### Cryptographic Security
- Uses Node.js `crypto.randomBytes()` for secure randomness
- SHA-256 seed generation for audit trails
- No predictable patterns in symbol selection

### Transaction Security
- Atomic database transactions ensure data consistency
- Pessimistic locking prevents race conditions
- Comprehensive audit logging for all operations

### Rate Limiting
- Built-in rate limiting via Fastify plugin
- Configurable limits per user/IP

## Fairness and RTP

### RTP (Return to Player)
- Configurable target RTP per game (default: 95%)
- Real-time RTP tracking and snapshots
- Weight-based symbol selection for mathematical fairness

### Audit Trail
- Every spin logged with RNG seed
- Reproducible results for regulatory compliance
- Complete transaction history with balances

## Configuration

### Game Setup

```typescript
// Create a new game
const game = await prisma.game.create({
  data: {
    name: "My Slot Game",
    type: "SLOT",
    rtp: 95.0,
    minBet: 0.01,
    maxBet: 100.0,
    maxWin: 10000.0
  }
});

// Add symbols with weights
await prisma.gameSymbol.createMany({
  data: [
    { gameId: game.id, symbol: "CHERRY", multiplier: 2.0, weight: 15 },
    { gameId: game.id, symbol: "BAR", multiplier: 5.0, weight: 8 },
    // ... more symbols
  ]
});

// Add paylines
await prisma.payline.createMany({
  data: [
    {
      gameId: game.id,
      name: "Horizontal Top",
      pattern: JSON.stringify([
        {row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}
      ])
    },
    // ... more paylines
  ]
});
```

### Symbol Weights

Symbol weights control frequency of appearance:
- Higher weight = more frequent appearance
- Weights should sum to reasonable total (not necessarily 100)
- Wild symbols typically have lower weights

### Payline Patterns

Paylines defined as arrays of grid positions:
```json
[
  {"row": 0, "col": 0}, {"row": 0, "col": 1}, {"row": 0, "col": 2}
]
```

Standard 5 paylines included:
1. Horizontal Top (row 0)
2. Horizontal Middle (row 1)
3. Horizontal Bottom (row 2)
4. Diagonal Left (top-left to bottom-right)
5. Diagonal Right (top-right to bottom-left)

## Error Handling

### Common Error Scenarios

- **Insufficient Balance**: User wallet doesn't cover bet amount
- **Invalid Bet Amount**: Below min or above max bet limits
- **Game Not Found**: Invalid or inactive game ID
- **Transaction Failure**: Database errors during bet processing

### Error Responses

```json
{
  "success": false,
  "error": "Insufficient balance"
}
```

## Performance Considerations

### Caching
- Game configurations cached in memory
- Cache invalidation on configuration changes
- Configurable cache size limits

### Database
- Indexed queries for history and statistics
- Efficient pagination for large datasets
- Connection pooling via Prisma

### Rate Limiting
- Prevents abuse and ensures fair usage
- Configurable limits per endpoint
- Memory-based implementation (can be upgraded to Redis)

## Deployment

### Database Migration
```bash
cd apps/server
npm run prisma:dbpush
npm run prisma:seed
```

### Development
```bash
cd apps/server
npm run dev
```

### Production
```bash
cd apps/server
npm run build
npm start
```

## Monitoring

### Health Checks
- `GET /health` - Basic service health
- Database connectivity verification
- Memory usage monitoring

### Logging
- Structured JSON logging via Pino
- Audit logs for all betting operations
- Error tracking with stack traces
- Performance metrics logging

## Compliance

### Audit Requirements
- Every spin recorded with RNG seed
- Reproducible results for regulatory checks
- Complete transaction history
- User balance tracking

### Data Retention
- Configurable retention periods
- Automatic cleanup of old data
- Compliance with jurisdictional requirements

## Future Enhancements

### Planned Features
- Progressive jackpot support
- Bonus rounds and free spins
- Multi-language support
- Mobile-optimized API
- Real-time statistics dashboard

### Scalability Improvements
- Redis-based rate limiting
- Horizontal scaling support
- Microservice architecture migration
- Advanced caching strategies