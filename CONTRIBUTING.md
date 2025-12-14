# Contributing Guidelines

Thank you for contributing to this project! This document provides guidelines and best practices for development.

## Development Setup

1. **Prerequisites**
   - Node.js 18.x or higher
   - Yarn 1.22.x or higher
   - Docker and Docker Compose (for database)

2. **Initial Setup**

   ```bash
   # Clone the repository
   git clone <repository-url>
   cd monorepo-stack

   # Install dependencies
   yarn install

   # Copy environment variables
   cp .env.example .env
   # Also copy for API development
   cp .env.example apps/api/.env

   # Start PostgreSQL
   docker compose up postgres -d

   # Build shared package (required first)
   yarn workspace @monorepo/shared build
   ```

3. **Start Development Servers**

   ```bash
   # Terminal 1: API
   yarn dev

   # Terminal 2: Admin Panel
   yarn dev:admin

   # Terminal 3: Client App
   yarn dev:client
   ```

## Workflow

### Before Committing

1. **Build all packages**

   ```bash
   yarn build
   ```

2. **Run linter**

   ```bash
   yarn lint
   # Auto-fix issues
   yarn lint:fix
   ```

3. **Check formatting**

   ```bash
   yarn format:check
   # Auto-format
   yarn format
   ```

4. **Type check**
   ```bash
   yarn typecheck
   ```

Note: Pre-commit hooks will automatically run linting and formatting on staged files.

### Adding New Dependencies

- **Workspace-specific**: Add to the workspace's `package.json`

  ```bash
  yarn workspace @monorepo/api add express
  ```

- **Root-level dev dependencies**: Add to root `package.json`
  ```bash
  yarn add -W -D eslint
  ```

### Creating New Shared Types

1. Add types to `/packages/shared/src/types/`
2. Export from `/packages/shared/src/index.ts`
3. Build the shared package: `yarn workspace @monorepo/shared build`
4. Import in other workspaces: `import { YourType } from '@monorepo/shared'`

## Code Style

### TypeScript

- Use TypeScript for all new code
- Avoid `any` type - use `unknown` if necessary
- Prefix unused parameters with underscore: `(_req, res) => {}`
- Use interfaces for object shapes, types for unions/intersections

### Imports

Imports are automatically ordered by ESLint:

1. Node built-ins
2. External packages
3. Internal packages
4. Parent directories
5. Sibling files
6. Index files

```typescript
import { readFile } from 'fs/promises';

import express from 'express';

import { User } from '@monorepo/shared';

import { logger } from '../middleware/logger';
```

### Error Handling

- Use `AppError` class for operational errors
- Let the error middleware handle errors
- Log errors with appropriate context

```typescript
import { AppError } from '../middleware/errorHandler';

throw new AppError('User not found', 404);
```

### API Responses

Use consistent response format:

```typescript
// Success
res.json({
  status: 'success',
  data: { ... }
});

// Error (handled by middleware)
throw new AppError('Error message', statusCode);
```

## Testing

### Unit Tests

Place test files next to the code they test:

```
src/
  utils/
    validator.ts
    validator.test.ts
```

Run tests:

```bash
yarn test
```

### Integration Tests

API integration tests should test complete request/response cycles.

## Database

### Schema Changes

1. Update `/docker/postgres/init.sql`
2. Restart PostgreSQL:
   ```bash
   docker compose down postgres
   docker compose up postgres -d
   ```

### Accessing Database

```bash
# CLI
docker compose exec postgres psql -U postgres -d monorepo_db

# Web UI (Adminer)
docker compose --profile tools up adminer -d
# Visit http://localhost:8080

# Web UI (pgAdmin)
docker compose --profile tools up pgadmin -d
# Visit http://localhost:5050
```

## Docker

### Building Images

```bash
# Build specific service
docker compose build api

# Build all services
docker compose build
```

### Running Services

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up postgres -d

# View logs
docker compose logs -f api

# Stop services
docker compose down
```

## Common Issues

### "Cannot find module '@monorepo/shared'"

Build the shared package first:

```bash
yarn workspace @monorepo/shared build
```

### "Configuration validation failed: JWT_SECRET"

Ensure `.env` file exists in `apps/api/`:

```bash
cp .env.example apps/api/.env
```

### Port Already in Use

Check which process is using the port:

```bash
lsof -i :3000
```

Kill the process or change the port in `.env`.

### TypeScript Errors After Adding Dependencies

Clear build cache and rebuild:

```bash
rm -rf apps/*/dist packages/*/dist
yarn build
```

## Git Commit Messages

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:

```
feat(api): add user authentication endpoint
fix(client): resolve login form validation
docs(readme): update setup instructions
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass:
   - `yarn lint`
   - `yarn typecheck`
   - `yarn build`
   - `yarn test`
4. Commit with conventional commit messages
5. Push and create a pull request
6. Wait for code review

## Questions?

If you have questions or need help, please:

- Check the README.md
- Review existing code for examples
- Ask in pull request comments
- Open an issue for discussion
