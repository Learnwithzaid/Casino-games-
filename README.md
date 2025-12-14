# Monorepo Stack

A production-ready monorepo boilerplate with TypeScript, Express API, React frontends, and PostgreSQL database.

## Architecture Overview

This monorepo uses Yarn workspaces to manage multiple applications and shared packages:

```
monorepo-stack/
├── apps/
│   ├── api/          # Express.js REST API
│   ├── admin/        # React admin panel (Vite)
│   └── client/       # React client app (Vite)
├── packages/
│   └── shared/       # Shared TypeScript types
├── docker/
│   └── postgres/     # Database initialization scripts
└── docker-compose.yml
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Package Manager**: Yarn (with workspaces)
- **Language**: TypeScript
- **API Framework**: Express.js
- **Frontend Framework**: React 18 with Vite
- **Database**: PostgreSQL 16
- **Code Quality**: ESLint + Prettier
- **Git Hooks**: Husky
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 18.x or higher
- Yarn 1.22.x or higher
- Docker & Docker Compose (for containerized setup)

## Getting Started

### Local Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd monorepo-stack
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Start PostgreSQL** (if not using Docker for development)

   ```bash
   # Using Docker for just the database
   docker compose up postgres -d
   ```

5. **Run the API in development mode**

   ```bash
   yarn dev
   ```

6. **Run the admin panel** (in a separate terminal)

   ```bash
   yarn dev:admin
   ```

7. **Run the client app** (in a separate terminal)
   ```bash
   yarn dev:client
   ```

### Docker Development Setup

Run the entire stack with Docker Compose:

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

To include optional database management tools (Adminer and pgAdmin):

```bash
docker compose --profile tools up -d
```

## Available Scripts

### Root Level

- `yarn dev` - Start the API in development mode
- `yarn dev:admin` - Start the admin panel in development mode
- `yarn dev:client` - Start the client app in development mode
- `yarn build` - Build all workspaces
- `yarn lint` - Lint all code
- `yarn lint:fix` - Lint and auto-fix issues
- `yarn format` - Format all code with Prettier
- `yarn format:check` - Check code formatting
- `yarn test` - Run tests in all workspaces
- `yarn typecheck` - Type check all workspaces
- `yarn docker:up` - Start Docker services
- `yarn docker:down` - Stop Docker services
- `yarn docker:logs` - View Docker logs

### Individual Workspaces

```bash
# Run commands in specific workspace
yarn workspace @monorepo/api <command>
yarn workspace @monorepo/admin <command>
yarn workspace @monorepo/client <command>
yarn workspace @monorepo/shared <command>
```

## API Endpoints

### Health Check

**GET** `/health`

Returns the health status of the API and database connection.

```json
{
  "uptime": 123.456,
  "message": "OK",
  "timestamp": 1703001234567,
  "environment": "development",
  "database": "connected"
}
```

### Root

**GET** `/`

Returns basic API information.

```json
{
  "message": "API is running",
  "version": "1.0.0",
  "environment": "development"
}
```

## Environment Variables

### API Service

| Variable       | Description                               | Default                 |
| -------------- | ----------------------------------------- | ----------------------- |
| `NODE_ENV`     | Environment (development/production/test) | `development`           |
| `API_PORT`     | API server port                           | `3000`                  |
| `API_HOST`     | API server host                           | `0.0.0.0`               |
| `DB_HOST`      | PostgreSQL host                           | `localhost`             |
| `DB_PORT`      | PostgreSQL port                           | `5432`                  |
| `DB_NAME`      | Database name                             | `monorepo_db`           |
| `DB_USER`      | Database user                             | `postgres`              |
| `DB_PASSWORD`  | Database password                         | `postgres`              |
| `DATABASE_URL` | Full database connection string           | -                       |
| `JWT_SECRET`   | Secret key for JWT tokens                 | **Required**            |
| `CORS_ORIGIN`  | Allowed CORS origins (comma-separated)    | `http://localhost:5173` |
| `LOG_LEVEL`    | Logging level                             | `info`                  |

### Frontend Apps

Both admin and client apps can use environment variables prefixed with `VITE_`:

| Variable       | Description  | Default                 |
| -------------- | ------------ | ----------------------- |
| `VITE_API_URL` | API base URL | `http://localhost:3000` |

## Database

### Schema

The database is automatically initialized with the schema defined in `docker/postgres/init.sql` when using Docker Compose.

### Accessing the Database

#### Using Docker Exec

```bash
docker compose exec postgres psql -U postgres -d monorepo_db
```

#### Using Adminer (Web UI)

Start with tools profile and visit http://localhost:8080

```bash
docker compose --profile tools up adminer -d
```

#### Using pgAdmin (Web UI)

Start with tools profile and visit http://localhost:5050

```bash
docker compose --profile tools up pgadmin -d
```

Default credentials (set in `.env`):

- Email: admin@example.com
- Password: admin

## Project Structure

### `/apps/api`

Express.js REST API with:

- Config loader with validation (Zod)
- Structured logging (Winston)
- Request logging (Morgan)
- Error handling middleware
- Health check endpoint
- PostgreSQL connection

### `/apps/admin` & `/apps/client`

React applications built with:

- Vite for fast HMR and builds
- TypeScript for type safety
- Shared types from `@monorepo/shared`
- Basic health check integration

### `/packages/shared`

Shared TypeScript types and utilities used across all apps.

## Security Best Practices

### Environment Variables

- **Never commit `.env` files** to version control
- Use `.env.example` as a template
- Rotate secrets regularly in production
- Use strong, unique values for `JWT_SECRET`

### HTTPS Requirement

In production:

- Always use HTTPS for API and frontend apps
- Configure SSL/TLS certificates (Let's Encrypt recommended)
- Use a reverse proxy (nginx, Caddy) for SSL termination

### Secret Management

For production deployments:

- Use a secret management service (AWS Secrets Manager, HashiCorp Vault, etc.)
- Never hardcode secrets in code or Docker images
- Use environment-specific secret rotation policies

### Database Security

- Use strong passwords for database users
- Limit database access to necessary services only
- Enable SSL/TLS for database connections in production
- Regular backups and disaster recovery planning

### API Security

The API includes several security measures:

- **Helmet**: Sets security HTTP headers
- **CORS**: Configured with allowed origins
- **Input validation**: Use Zod for request validation
- **Error handling**: Prevents information leakage

### Recommended Additional Security

1. **Rate Limiting**: Add express-rate-limit
2. **Authentication**: Implement JWT-based auth
3. **Authorization**: Role-based access control (RBAC)
4. **Input Sanitization**: Prevent XSS and injection attacks
5. **Audit Logging**: Track security-relevant events
6. **Dependency Scanning**: Regular npm audit/yarn audit
7. **Container Scanning**: Scan Docker images for vulnerabilities

## Testing

Tests can be added to each workspace. Run all tests with:

```bash
yarn test
```

### Adding Tests

1. Create `*.test.ts` or `*.spec.ts` files alongside your code
2. Configure Jest in each workspace's package.json
3. Use shared test utilities from `@monorepo/shared`

## Code Quality

### Linting

```bash
# Check for linting errors
yarn lint

# Auto-fix linting errors
yarn lint:fix
```

### Formatting

```bash
# Check formatting
yarn format:check

# Auto-format code
yarn format
```

### Type Checking

```bash
yarn typecheck
```

## Git Hooks

Husky is configured with pre-commit hooks:

1. **Pre-commit**: Runs lint-staged to lint and format staged files
2. **Pre-push**: Can be configured for tests

## Deployment

### Building for Production

```bash
# Build all apps
yarn build

# Or build specific app
yarn workspace @monorepo/api build
```

### Docker Production Build

The API includes a multi-stage Dockerfile optimized for production:

```bash
docker build -t monorepo-api:latest -f apps/api/Dockerfile .
```

### Environment-Specific Configuration

Create environment-specific files:

- `.env.development`
- `.env.staging`
- `.env.production`

Load the appropriate file based on your deployment environment.

## Troubleshooting

### Port Already in Use

If ports 3000, 5173, 5174, or 5432 are in use:

1. Change ports in `.env`
2. Update `docker-compose.yml` port mappings
3. Update CORS_ORIGIN in API config

### Database Connection Issues

1. Ensure PostgreSQL is running: `docker compose ps`
2. Check logs: `docker compose logs postgres`
3. Verify credentials in `.env`
4. Test connection: `docker compose exec postgres pg_isready`

### TypeScript Errors

1. Rebuild shared package: `yarn workspace @monorepo/shared build`
2. Clean and reinstall: `rm -rf node_modules && yarn install`
3. Check tsconfig.json extends paths

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all tests pass: `yarn test`
4. Ensure linting passes: `yarn lint`
5. Ensure types check: `yarn typecheck`
6. Format code: `yarn format`
7. Commit with conventional commits
8. Create a pull request

## License

MIT
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
