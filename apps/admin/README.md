# Admin Panel

A comprehensive admin dashboard for managing the gaming platform, built with React, TypeScript, and Material-UI.

## Features

- **Secure Authentication**: Email/password login with 2FA (TOTP) support
- **Role-Based Access Control (RBAC)**: Admin and SuperAdmin roles with granular permissions
- **Game Management**: Create, update, and manage games with configurable parameters
- **User Management**: View user profiles, balances, and transaction history
- **Transaction Monitoring**: Real-time transaction tracking with export capabilities
- **Audit Logs**: Complete audit trail of all platform changes
- **Settings Management**: Platform configuration and maintenance mode toggle
- **Responsive Design**: Mobile-friendly interface with Material-UI

## Quick Start

### Installation

```bash
npm install
# or
yarn install
```

### Environment Variables

Create a `.env.local` file in the admin directory:

```env
VITE_API_URL=http://localhost:3000
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

The admin panel will be available at `http://localhost:5174`

### Building for Production

```bash
npm run build
# or
yarn build
```

### Running Tests

```bash
npm run test
# or
npm run test:watch
```

### Linting and Formatting

```bash
npm run lint
npm run lint:fix
npm run format
```

## Authentication

### Login Flow

1. Navigate to `/login`
2. Enter admin email and password
3. If 2FA is enabled, verify with authenticator app
4. Session token is stored in Zustand store and persisted to localStorage

### Session Management

- Sessions expire after configured timeout
- Invalid sessions trigger automatic logout and redirect to login
- TOTP 2FA provides enhanced security

## RBAC System

### Roles

- **Admin**: Read-only access to most features, can manage games and users
- **SuperAdmin**: Full access to all features including settings and admin management

### Permissions

```typescript
enum Permission {
  READ_GAMES = 'read:games',
  WRITE_GAMES = 'write:games',
  DELETE_GAMES = 'delete:games',
  READ_USERS = 'read:users',
  WRITE_USERS = 'write:users',
  READ_TRANSACTIONS = 'read:transactions',
  WRITE_TRANSACTIONS = 'write:transactions',
  READ_AUDIT_LOGS = 'read:audit_logs',
  MANAGE_SETTINGS = 'manage:settings',
  MANAGE_ADMINS = 'manage:admins',
}
```

### Usage

```typescript
import { hasPermission, canViewSection } from '@/utils/rbac';
import { useAuthStore } from '@/store/authStore';
import { Permission } from '@/utils/rbac';

const MyComponent = () => {
  const { user } = useAuthStore();

  if (!hasPermission(user, Permission.WRITE_GAMES)) {
    return <div>No permission</div>;
  }

  return <div>Game Management</div>;
};
```

## Pages

### Dashboard

Overview of platform statistics:
- Total users
- Active games
- Total transactions
- Total revenue

### Games Management

Create and manage games:
- Game details (name, provider, RTP)
- Bet limits configuration
- Symbol and payline management

### Users

View and manage user accounts:
- User list with pagination
- Detailed user drawer with balance and transaction history
- Status filtering

### Transactions

Monitor all transactions:
- Real-time transaction list
- Status filtering (pending, confirmed, failed)
- Export to CSV

### Audit Logs

Review platform audit trail:
- Complete action history
- Entity tracking
- User activity logging
- Filterable by entity type

### Settings

Platform configuration:
- Maintenance mode toggle
- Betting limits
- Session timeout
- IP whitelist (placeholder)

## API Integration

The admin panel integrates with backend APIs through Axios with automatic token injection:

### Base Routes

All admin API endpoints are prefixed with `/api/admin/`

### Key Endpoints

- `POST /auth/login` - Login with credentials
- `POST /auth/totp/setup` - Setup 2FA
- `POST /auth/totp/verify` - Verify TOTP code
- `GET /auth/validate` - Validate current session
- `GET /games` - List games
- `GET /users` - List users
- `GET /transactions` - List transactions
- `GET /audit-logs` - List audit logs
- `GET /settings` - Get platform settings

## Components

### Layout

Main application layout with sidebar navigation and top bar.

### ProtectedRoute

Wraps routes that require authentication and optional role checking.

### DataTable

Reusable table component with:
- Pagination
- Sorting
- Column customization
- Export functionality

### FormBuilder

Dynamic form generation with:
- Field validation using Zod
- Multiple field types
- Error handling

### Login

Admin login form with email/password.

### TOTPVerification

TOTP 2FA verification form.

## Testing

Tests are written using Vitest and React Testing Library:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage
```

### Test Examples

- Auth guard protection
- RBAC enforcement
- Component rendering
- API integration

## Accessibility

The admin panel follows WCAG 2.1 AA standards:
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Color contrast compliance

Run accessibility checks:

```bash
npm run lint -- --fix
```

## Performance

Optimizations implemented:
- Lazy loading of pages using React.lazy
- Code splitting per route
- Memoized components where appropriate
- Optimized re-renders

## Troubleshooting

### Port Already in Use

If port 5174 is already in use, modify `vite.config.ts`:

```typescript
server: {
  port: 5175, // Change to another port
}
```

### API Connection Issues

- Verify backend is running on `http://localhost:3000`
- Check `VITE_API_URL` environment variable
- Ensure CORS is enabled on backend

### Authentication Failures

- Confirm admin user exists in database
- Check session timeout settings
- Verify 2FA secret if TOTP is required

## Contributing

1. Follow the project code style (ESLint + Prettier)
2. Add tests for new features
3. Update documentation as needed
4. Use TypeScript for type safety

## License

MIT
