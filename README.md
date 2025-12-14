# Gaming API Database Schema

This project implements a comprehensive database schema for a gaming platform using Prisma ORM with PostgreSQL. The schema includes user management, financial transactions, gaming systems, and audit capabilities.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+
- Git

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd gaming-api
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb gaming_db
   
   # Run migrations and seed data
   npm run db:setup
   ```

## 📊 Database Schema Overview

The schema includes the following main entities:

### Core Entities
- **Users**: User accounts with roles (PLAYER, ADMIN, SUPER_ADMIN) and security features
- **Wallets**: User wallet management with multi-currency support
- **Sessions/RefreshTokens**: Authentication and session management
- **Transactions**: Financial transactions (deposits, withdrawals, bets, wins, bonuses)

### Gaming Entities
- **Games**: Game definitions and configuration
- **GameSymbols**: Slot game symbol definitions
- **Paylines**: Winning line patterns for slot games
- **GameSettings**: Advanced game configuration (RTP, volatility, etc.)

### System Entities
- **AuditLogs**: Comprehensive audit trail
- **PaymentWebhooks**: External payment provider webhook handling
- **SystemSettings**: Global system configuration

For detailed entity descriptions, see [ER_DIAGRAM.md](./ER_DIAGRAM.md).

## 🔧 Database Migrations

### Development Environment

1. **Initial Setup**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Create and apply initial migration
   npm run prisma:migrate
   
   # Load seed data
   npm run prisma:seed
   ```

2. **Making Schema Changes**
   ```bash
   # After modifying schema.prisma
   npm run prisma:migrate -- --name describe-your-change
   ```

3. **Database Studio**
   ```bash
   # Visual database browser
   npm run prisma:studio
   ```

### Staging Environment

1. **Apply Migrations**
   ```bash
   # Apply all pending migrations
   npm run prisma:deploy
   
   # Or for specific migration
   npx prisma migrate deploy --name migration-name
   ```

2. **Seed Data (Optional)**
   ```bash
   # Load seed data (use with caution in production)
   npm run prisma:seed
   ```

### Production Environment

```bash
# Apply migrations (read-only, no prompts)
NODE_ENV=production npx prisma migrate deploy

# Backup database before applying migrations
pg_dump gaming_db > backup_before_migration.sql

# Rollback if needed (plan this carefully)
psql gaming_db < backup_before_migration.sql
```

## 🗄️ Migration Commands Reference

### Development Commands
```bash
# Create new migration (interactive)
npm run prisma:migrate

# Create migration without prompting
npx prisma migrate dev --name your-migration-name

# Reset database (destructive!)
npx prisma migrate reset

# Deploy migrations (non-interactive)
npm run prisma:deploy

# Generate client after schema changes
npm run prisma:generate
```

### Migration Files
Migration files are located in `prisma/migrations/`:
- Each migration has a unique timestamp and name
- Contains both `up` and `down` SQL files
- Version controlled - never edit existing migrations

### Common Migration Patterns

**Adding a new table:**
```prisma
model NewEntity {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  
  @@map("new_entity")
}
```

**Adding a column:**
```prisma
model User {
  // existing fields...
  newField String? // nullable
}
```

**Creating an index:**
```prisma
model User {
  // existing fields...
  
  @@index([email])
  @@unique([username])
}
```

## 🌱 Seeding Data

### Seed Script Structure
The seed script (`prisma/seed.ts`) creates:

1. **Default Admin User**
   - Email: `admin@gamingapi.com`
   - Password: `admin123!`
   - Role: SUPER_ADMIN

2. **Sample Player User**
   - Email: `player@gamingapi.com`  
   - Password: `player123!`
   - Role: PLAYER

3. **Sample Gaming Data**
   - "Lucky Sevens" slot game
   - Game symbols and paylines
   - Game settings with RTP configuration

4. **System Configuration**
   - Platform settings
   - Payment limits and fees
   - Security configurations

### Running Seeds

```bash
# Fresh database seeding
npm run prisma:seed

# Reset and reseed
npm run db:reset
npm run prisma:seed

# Custom seed file
npx prisma db seed --preview-feature
```

### Extending Seed Data

Add new seed data to `prisma/seed.ts`:

```typescript
// Add new game
const newGame = await prisma.game.create({
  data: {
    name: 'Your Game Name',
    slug: 'your-game-slug',
    provider: 'Your Provider',
    type: 'SLOT',
    rtp: 96.00,
    // ... other fields
  },
});
```

## 🔍 Schema Validation

### Data Integrity Constraints

**Non-negative balances:**
- Enforced at application level
- Checked before each transaction
- Database constraints can be added for additional safety

**Unique constraints:**
- User emails and usernames
- Game names and slugs
- Session and refresh tokens
- System setting keys

**Foreign key constraints:**
- Referential integrity across all relationships
- Cascade deletes for dependent records
- SetNull for audit logs to preserve history

### Indexes for Performance

Key indexes include:
- All primary keys (UUID)
- Unique business identifiers
- Foreign key columns
- Status and type fields
- CreatedAt fields for time-based queries
- Composite indexes for common query patterns

## 📈 Analytics & Reporting

### Recommended Queries

**User analytics:**
```sql
-- Active users by month
SELECT DATE_TRUNC('month', created_at) as month, COUNT(*)
FROM users 
WHERE status = 'ACTIVE'
GROUP BY month ORDER BY month;
```

**Transaction analytics:**
```sql
-- Daily transaction volume
SELECT DATE(created_at) as date, 
       SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) as deposits,
       SUM(CASE WHEN type = 'WITHDRAWAL' THEN ABS(amount) ELSE 0 END) as withdrawals
FROM transactions 
WHERE status = 'COMPLETED'
GROUP BY date ORDER BY date;
```

**Game performance:**
```sql
-- Most popular games
SELECT g.name, COUNT(t.id) as play_count
FROM games g
JOIN transactions t ON t.referenceId LIKE '%' || g.slug || '%'
WHERE t.type = 'BET' AND t.status = 'COMPLETED'
GROUP BY g.name
ORDER BY play_count DESC;
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/gaming_db"

# Application
NODE_ENV="development"
PORT=3000

# Security
JWT_SECRET="your-secret-key"
BCRYPT_SALT_ROUNDS=12

# External APIs
PAYMENT_PROCESSOR_API_KEY="your-key"
PAYMENT_PROCESSOR_WEBHOOK_SECRET="your-secret"
```

### Prisma Configuration

The Prisma schema (`schema.prisma`) is configured for:
- PostgreSQL provider
- Decimal fields for precise financial data
- Proper cascading rules
- Comprehensive indexing strategy

## 🧪 Testing the Schema

### Manual Testing

1. **Test database connection:**
   ```bash
   npm run prisma:generate
   npx prisma db push
   ```

2. **Test seed data:**
   ```bash
   npm run prisma:seed
   npx prisma studio  # Visual verification
   ```

3. **Test migrations:**
   ```bash
   npm run prisma:migrate reset
   npm run db:setup
   ```

### Validation Queries

```sql
-- Check table creation
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify indexes
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public';

-- Test constraints
SELECT conname, contype FROM pg_constraint 
WHERE connamespace = 'public'::regnamespace;
```

## 🚨 Troubleshooting

### Common Issues

**Migration conflicts:**
```bash
# Reset migrations (development only)
rm -rf prisma/migrations/*
npm run prisma:migrate dev --name init
```

**Database connection errors:**
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists

**Seed script failures:**
```bash
# Clear database and retry
npm run prisma:migrate reset
npm run prisma:seed
```

**Prisma client out of sync:**
```bash
# Regenerate client
npm run prisma:generate
```

### Getting Help

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Schema visualization: `npx prisma studio`

## 📝 Documentation Files

- [ER_DIAGRAM.md](./ER_DIAGRAM.md) - Detailed entity relationships
- [README.md](./README.md) - This file
- `schema.prisma` - Prisma schema definition
- `prisma/seed.ts` - Database seeding script

## 🤝 Contributing

1. Create feature branch from `main`
2. Make schema changes
3. Create migration: `npm run prisma:migrate -- --name your-change`
4. Update documentation
5. Test thoroughly before submitting PR

---

**Note**: This schema is designed for production use with proper indexes, constraints, and data types. Always test migrations in a development environment first, and maintain database backups for production deployments.
