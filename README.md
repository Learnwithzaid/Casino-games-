# Wallet Ledger Service

A robust wallet ledger service with atomic transactions, real-time balances, and immutable transaction logs.

## Features

- **Atomic Operations**: All wallet operations are executed within database transactions with pessimistic locking (`SELECT FOR UPDATE`)
- **Dual Ledger System**: Each transaction creates entries in both Transactions and Ledger tables for complete audit trails
- **Optimistic Locking**: Version columns on Wallets prevent concurrent modification issues
- **Configurable Limits**: Bet and deposit limits can be configured via Settings
- **Complete Audit Trail**: All operations are logged with timestamps, correlation IDs, and before/after balances
- **RESTful API**: Well-structured endpoints for users, games, and admin operations
- **Concurrent Safe**: Designed to handle concurrent operations without race conditions

## Tech Stack

- Node.js + TypeScript
- Express.js
- TypeORM
- PostgreSQL
- Jest (for testing)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=wallet_ledger
DB_SYNC=true
DB_LOGGING=false

MAX_BET_AMOUNT=10000
MAX_DEPOSIT_AMOUNT=50000
MIN_WITHDRAWAL_AMOUNT=10
```

## Database Setup

The application will automatically create tables when `DB_SYNC=true`. For production, set this to `false` and use migrations.

```bash
# Create database
createdb wallet_ledger
```

## Running the Application

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### User Endpoints

**Get Balance**
```
GET /api/user/balance
Headers: x-user-id: <userId>
```

**Deposit**
```
POST /api/user/deposit
Headers: x-user-id: <userId>
Body: { amount: number, paymentWebhookId: string }
```

**Withdrawal**
```
POST /api/user/withdrawal
Headers: x-user-id: <userId>
Body: { amount: number, paymentWebhookId: string }
```

### Game Endpoints

**Place Bet**
```
POST /api/game/bet
Headers: x-user-id: <userId>
Body: { amount: number, gameRoundId: string }
```

**Credit Win**
```
POST /api/game/win
Headers: x-user-id: <userId>
Body: { amount: number, gameRoundId: string }
```

**Get Transaction History**
```
GET /api/game/history?page=1&limit=20&type=bet&status=completed
Headers: x-user-id: <userId>
```

### Admin Endpoints

**Get All Transactions**
```
GET /api/admin/transactions?userId=<userId>&page=1&limit=20
Headers: x-user-id: <adminId>, x-user-role: admin
```

**Get User Balance**
```
GET /api/admin/user/:userId/balance
Headers: x-user-id: <adminId>, x-user-role: admin
```

**Make Adjustment**
```
POST /api/admin/adjustment
Headers: x-user-id: <adminId>, x-user-role: admin
Body: { userId: string, amount: number, reason: string }
```

**Update Settings**
```
POST /api/admin/settings
Headers: x-user-id: <adminId>, x-user-role: admin
Body: { key: string, value: string, description?: string }
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Architecture

### Database Schema

**Wallets**
- `id` (UUID, PK)
- `userId` (UUID, unique)
- `balance` (decimal)
- `currency` (varchar)
- `version` (int, for optimistic locking)
- `createdAt`, `updatedAt`

**Transactions**
- `id` (UUID, PK)
- `walletId` (UUID)
- `userId` (UUID)
- `amount` (decimal)
- `type` (enum: bet, win, deposit, withdrawal, adjustment)
- `status` (enum: pending, completed, failed, cancelled)
- `gameRoundId` (UUID, nullable)
- `paymentWebhookId` (UUID, nullable)
- `balanceBefore` (decimal)
- `balanceAfter` (decimal)
- `description` (text)
- `createdAt`

**Ledger**
- `id` (UUID, PK)
- `transactionId` (UUID)
- `walletId` (UUID)
- `userId` (UUID)
- `type` (enum)
- `amount` (decimal)
- `status` (enum)
- `correlationId` (varchar)
- `correlationType` (enum: game_round, payment_webhook, admin_adjustment)
- `balanceBefore` (decimal)
- `balanceAfter` (decimal)
- `metadata` (jsonb)
- `createdAt`

**Settings**
- `id` (UUID, PK)
- `key` (varchar, unique)
- `value` (text)
- `description` (text)
- `createdAt`, `updatedAt`

### Transaction Flow

1. Request received
2. Begin database transaction
3. Lock wallet row with `SELECT FOR UPDATE`
4. Validate operation (sufficient funds, limits)
5. Update wallet balance
6. Create Transaction record
7. Create Ledger record
8. Commit transaction
9. Log audit entry
10. Return result

### Error Handling

- `InsufficientFundsError` (400): Not enough balance
- `LimitExceededError` (400): Operation exceeds configured limits
- `WalletNotFoundError` (404): Wallet doesn't exist
- `ConcurrentModificationError` (409): Optimistic locking failure
- `ValidationError` (400): Invalid input

## Compliance & Audit

All wallet operations are fully logged with:
- Transaction IDs
- Correlation IDs (game rounds, payment webhooks)
- Before/after balances
- Timestamps
- Operation type and status
- Metadata (for admin operations)

The dual-entry system (Transactions + Ledger) ensures complete audit trails for regulatory compliance.

## License

ISC
