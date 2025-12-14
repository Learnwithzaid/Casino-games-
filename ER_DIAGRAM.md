# Database ER Diagram Documentation

## Overview
This document describes the Entity-Relationship diagram for the Gaming API database schema. The schema is implemented using Prisma ORM with PostgreSQL as the database provider.

## Entity Descriptions

### Core User Management

#### User
- **Purpose**: Main user entity representing all platform users (players, admins, super admins)
- **Key Fields**:
  - `email`: Unique email address for user identification
  - `username`: Unique username for user identification  
  - `passwordHash`: Hashed password for security
  - `role`: User role (PLAYER, ADMIN, SUPER_ADMIN)
  - `status`: Account status (ACTIVE, INACTIVE, SUSPENDED, BANNED, PENDING_VERIFICATION)
  - Security flags: `isEmailVerified`, `isTwoFactorEnabled`, `loginAttempts`, `lastLoginAt`
- **Indexes**: email, username, role, status, createdAt
- **Relations**: 
  - One-to-One with Wallet
  - One-to-Many with Session, RefreshToken, AuditLog

#### Wallet
- **Purpose**: User's wallet for managing funds and balance
- **Key Fields**:
  - `balance`: Current wallet balance (Decimal with 2 decimal places)
  - `currency`: Supported currencies (USD, EUR, GBP, CAD, AUD, BTC, ETH)
  - `isFrozen`: Flag to freeze/unfreeze wallet
  - `verificationLevel`: KYC verification level (1-3)
- **Constraints**: Balance must be non-negative (enforced at application level)
- **Indexes**: userId, currency, isFrozen, createdAt
- **Relations**: 
  - One-to-One with User
  - One-to-Many with Transaction

### Authentication & Sessions

#### Session
- **Purpose**: User session management for active login sessions
- **Key Fields**:
  - `token`: Unique session token
  - `ipAddress`: User's IP address for tracking
  - `userAgent`: Browser/device information
  - `status`: Session status (ACTIVE, EXPIRED, REVOKED)
  - `expiresAt`: Session expiration timestamp
- **Indexes**: userId, token, status, expiresAt
- **Relations**: Many-to-One with User (Cascade delete)

#### RefreshToken
- **Purpose**: JWT refresh token management for token renewal
- **Key Fields**:
  - `token`: Unique refresh token
  - `status`: Token status (ACTIVE, EXPIRED, REVOKED)
  - `expiresAt`: Token expiration timestamp
- **Indexes**: userId, token, status, expiresAt
- **Relations**: Many-to-One with User (Cascade delete)

### Financial Transactions

#### Transaction
- **Purpose**: All financial transactions (deposits, withdrawals, bets, wins, bonuses)
- **Key Fields**:
  - `type`: Transaction type (DEPOSIT, WITHDRAWAL, BET, WIN, BONUS, REFUND, ADJUSTMENT)
  - `amount`: Transaction amount (Decimal, positive for credits, negative for debits)
  - `currency`: Transaction currency
  - `status`: Transaction status (PENDING, COMPLETED, FAILED, CANCELLED, REVERSED)
  - `referenceId`: Reference to related game rounds or payment events
  - `externalId`: External payment processor ID
  - `metadata`: Additional transaction data in JSON format
- **Constraints**: Amount validation for non-negative wallet balances
- **Indexes**: walletId, type, status, currency, createdAt, referenceId, externalId
- **Relations**: Many-to-One with Wallet (Cascade delete)

### Gaming System

#### Game
- **Purpose**: Game definitions and configuration
- **Key Fields**:
  - `name`: Unique game name
  - `slug`: URL-friendly game identifier
  - `provider`: Game provider/developer
  - `type`: Game type (SLOT, TABLE, LIVE, etc.)
  - `rtp`: Return to Player percentage
  - `minBet`, `maxBet`, `maxWin`: Betting limits and win limits
- **Indexes**: name, slug, provider, isActive, createdAt
- **Relations**: 
  - One-to-Many with GameSymbol, Payline
  - One-to-One with GameSetting

#### GameSymbol
- **Purpose**: Game symbol definitions for slot games
- **Key Fields**:
  - `symbol`: Symbol character/value
  - `multiplier`: Symbol payout multiplier
  - Flags: `isScatter`, `isWild`, `isBonus`
  - `sortOrder`: Display order
- **Indexes**: gameId, symbol, isScatter, isWild, sortOrder
- **Relations**: Many-to-One with Game (Cascade delete)

#### Payline
- **Purpose**: Winning line patterns for slot games
- **Key Fields**:
  - `name`: Payline name/identifier
  - `pattern`: JSON array of reel positions defining the payline
  - `isActive`: Payline status
- **Indexes**: gameId, name, isActive
- **Relations**: Many-to-One with Game (Cascade delete)

#### GameSetting
- **Purpose**: Advanced game configuration and settings
- **Key Fields**:
  - `rtp`: Return to Player percentage
  - `volatility`: Game volatility (LOW, MEDIUM, HIGH)
  - `hitFrequency`: Expected hit frequency percentage
  - `freeSpinsEnabled`, `bonusRounds`: Feature flags
  - `multiplierMax`: Maximum multiplier value
- **Relations**: One-to-One with Game (Cascade delete)

### System & Audit

#### AuditLog
- **Purpose**: Comprehensive audit trail for all system actions
- **Key Fields**:
  - `action`: Action performed
  - `resource`: Resource type (User, Wallet, Game, etc.)
  - `resourceId`: ID of affected resource
  - `oldValues`, `newValues`: JSON objects with before/after values
  - `ipAddress`, `userAgent`: Request context
- **Indexes**: userId, action, resource, createdAt
- **Relations**: Many-to-One with User (SetNull on delete)

#### PaymentWebhook
- **Purpose**: External payment provider webhook handling
- **Key Fields**:
  - `paymentId`: Unique payment identifier
  - `provider`: Payment provider name
  - `event`: Webhook event type
  - `status`: Webhook processing status
  - `payload`: Raw webhook payload
  - `retryCount`: Number of processing attempts
- **Indexes**: paymentId, provider, event, status, createdAt

#### SystemSetting
- **Purpose**: Global system configuration and settings
- **Key Fields**:
  - `key`: Unique setting identifier
  - `value`: Setting value (JSON)
  - `description`: Human-readable description
  - `category`: Setting category (GENERAL, PAYMENT, SECURITY, etc.)
  - `isPublic`: Whether setting can be exposed to clients
- **Indexes**: key, category, isPublic, createdAt

## Relationships Summary

### One-to-One Relationships
- User → Wallet
- Game → GameSetting

### One-to-Many Relationships
- User → Session (Cascade)
- User → RefreshToken (Cascade)
- User → AuditLog (SetNull)
- Wallet → Transaction (Cascade)
- Game → GameSymbol (Cascade)
- Game → Payline (Cascade)

### Key Constraints & Rules

1. **User Uniqueness**: email and username must be unique across all users
2. **Cascade Deletes**: 
   - Deleting a user cascades to their sessions, refresh tokens, and transactions
   - Deleting a game cascades to symbols, paylines, and settings
3. **Balance Validation**: Wallet balances must remain non-negative
4. **Session Management**: Active sessions and refresh tokens are tracked separately
5. **Audit Trail**: All critical actions are logged with full context
6. **Currency Support**: Multi-currency support with proper Decimal precision

## Indexing Strategy

### Primary Indexes
- All primary keys use UUID for distributed system compatibility
- Unique constraints on business identifiers (email, username, game names)

### Composite Indexes for Analytics
- `(walletId, createdAt)` for transaction history queries
- `(userId, createdAt)` for user activity analytics
- `(gameId, isActive)` for active game lookups
- `(status, createdAt)` for status-based reporting

### Performance Indexes
- Foreign key columns are indexed for join performance
- Status and type fields are indexed for filtering
- CreatedAt fields are indexed for time-based queries

## Data Integrity

### Check Constraints (Application Level)
- Non-negative wallet balances
- Valid currency codes
- Reasonable bet limits
- Session expiration validation

### Referential Integrity
- Foreign key constraints enforce data consistency
- Cascade rules handle cleanup operations
- SetNull prevents orphaned audit records

This schema provides a robust foundation for a gaming platform with comprehensive user management, financial tracking, gaming functionality, and audit capabilities.
