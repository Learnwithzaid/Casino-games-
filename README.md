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
