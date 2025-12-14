# Authentication API Monorepo

Comprehensive authentication system with RBAC, 2FA, and session management.

## Structure

```
.
├── apps/
│   └── api/              # Authentication API application
│       ├── prisma/       # Database schema and migrations
│       ├── src/
│       │   ├── config/   # Configuration files
│       │   ├── controllers/  # Route controllers
│       │   ├── middleware/   # Express middleware
│       │   ├── models/       # Database models
│       │   ├── routes/       # API routes
│       │   ├── services/     # Business logic services
│       │   ├── tests/        # Test files
│       │   ├── types/        # TypeScript types
│       │   └── utils/        # Utility functions
│       └── package.json
└── README.md
```

## Quick Start

1. Navigate to the API directory:
```bash
cd apps/api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Start development server:
```bash
npm run dev
```

## Features

### Authentication
- ✅ User registration with email verification
- ✅ Secure login with Argon2 password hashing
- ✅ JWT access tokens (15 min expiry)
- ✅ Rotating refresh tokens (7 day expiry)
- ✅ Session management with device tracking
- ✅ Password reset flow with secure tokens
- ✅ Account lockout after failed login attempts

### Authorization (RBAC)
- ✅ Three role levels: USER, ADMIN, SUPERADMIN
- ✅ Structured permission system
- ✅ Middleware for role and permission checks
- ✅ Admin endpoints for user management

### Security
- ✅ TOTP-based Two-Factor Authentication (2FA)
- ✅ Rate limiting on authentication routes
- ✅ Secure HTTP headers with Helmet
- ✅ CORS configuration
- ✅ Email verification tokens with expiry
- ✅ Password reset tokens with expiry
- ✅ Session revocation
- ✅ Failed login attempt tracking

### Email Service
- ✅ Pluggable email provider abstraction
- ✅ Email verification notifications
- ✅ Password reset notifications
- ✅ Account lockout notifications
- ✅ 2FA enabled notifications

### Testing
- ✅ Comprehensive unit tests
- ✅ Integration tests for all endpoints
- ✅ RBAC permission tests
- ✅ 2FA flow tests
- ✅ Security feature tests

## API Documentation

See [apps/api/README.md](apps/api/README.md) for detailed API documentation.

## License

MIT
