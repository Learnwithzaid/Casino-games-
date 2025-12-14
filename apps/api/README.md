# Authentication API

A comprehensive authentication system with RBAC, 2FA, and session management.

## Features

- ✅ User registration with email verification
- ✅ User login with password hashing (Argon2)
- ✅ JWT access tokens and rotating refresh tokens
- ✅ Session management with device metadata
- ✅ Role-Based Access Control (USER, ADMIN, SUPERADMIN)
- ✅ Permission-based authorization
- ✅ Email verification with expiry tokens
- ✅ Password reset with secure tokens
- ✅ Account lockout after failed login attempts
- ✅ TOTP-based Two-Factor Authentication (2FA)
- ✅ Rate limiting on authentication routes
- ✅ Secure HTTP headers (Helmet)
- ✅ CORS support
- ✅ Comprehensive test coverage

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** Argon2
- **Validation:** Zod
- **2FA:** Speakeasy (TOTP)
- **Security:** Helmet, express-rate-limit
- **Testing:** Jest with Supertest

## Setup

1. Install dependencies:
```bash
cd apps/api
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Configure your database URL in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/authdb
```

4. Generate Prisma client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:** 201 Created
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "emailVerified": false
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "twoFactorCode": "123456"
}
```

**Response:** 200 OK
```json
{
  "message": "Login successful",
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "emailVerified": true,
    "twoFactorEnabled": false
  }
}
```

#### GET /api/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:** 200 OK
```json
{
  "message": "Tokens refreshed successfully",
  "accessToken": "new-jwt-access-token",
  "refreshToken": "new-jwt-refresh-token"
}
```

#### POST /api/auth/logout
Logout and revoke refresh token.

**Request:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:** 200 OK
```json
{
  "message": "Logout successful"
}
```

#### POST /api/auth/verify-email
Verify email address with token.

**Request:**
```json
{
  "token": "verification-token"
}
```

**Response:** 200 OK
```json
{
  "message": "Email verified successfully"
}
```

#### POST /api/auth/request-reset
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** 200 OK
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### POST /api/auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "reset-token",
  "password": "NewPassword123!"
}
```

**Response:** 200 OK
```json
{
  "message": "Password reset successfully"
}
```

### Two-Factor Authentication

#### POST /api/auth/2fa/enable
Initialize 2FA setup (requires authentication).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:** 200 OK
```json
{
  "message": "Two-factor authentication initiated",
  "secret": "base32-secret",
  "qrCode": "otpauth://..."
}
```

#### POST /api/auth/2fa/verify
Verify and enable 2FA (requires authentication).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request:**
```json
{
  "code": "123456"
}
```

**Response:** 200 OK
```json
{
  "message": "Two-factor authentication enabled successfully"
}
```

#### POST /api/auth/2fa/disable
Disable 2FA (requires authentication).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:** 200 OK
```json
{
  "message": "Two-factor authentication disabled successfully"
}
```

## RBAC (Role-Based Access Control)

### Roles

- **USER:** Basic user with limited permissions
- **ADMIN:** Can create and update users, view all users
- **SUPERADMIN:** Full access including user deletion and role management

### Permissions

| Permission | USER | ADMIN | SUPERADMIN |
|------------|------|-------|------------|
| canCreateUser | ❌ | ✅ | ✅ |
| canUpdateUser | ❌ | ✅ | ✅ |
| canDeleteUser | ❌ | ❌ | ✅ |
| canViewUsers | ❌ | ✅ | ✅ |
| canManageRoles | ❌ | ❌ | ✅ |

### Usage

#### Require specific role(s):
```typescript
import { authenticate } from './middleware/auth.middleware';
import { requireRole } from './middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

router.get('/admin/users', 
  authenticate, 
  requireRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  controller.getUsers
);
```

#### Require specific permission:
```typescript
import { authenticate } from './middleware/auth.middleware';
import { requirePermission } from './middleware/rbac.middleware';

router.delete('/admin/users/:id', 
  authenticate, 
  requirePermission('canDeleteUser'),
  controller.deleteUser
);
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Account Lockout
- Maximum 5 failed login attempts
- 15-minute lockout period
- Email notification on lockout

### Token Expiry
- Email verification: 24 hours
- Password reset: 1 hour
- Access token: 15 minutes
- Refresh token: 7 days

### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes

## Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Email Service

The email service uses an abstraction layer that can be easily replaced with any email provider (SendGrid, AWS SES, etc.).

Current implementation logs emails to console for development. To use a real email provider:

```typescript
import { emailService, EmailProvider } from './services/email.service';

class MyEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Your email provider implementation
  }
}

emailService.setProvider(new MyEmailProvider());
```

## Database Schema

The system uses Prisma with PostgreSQL. Key models:

- **User:** Core user data with authentication fields
- **Session:** Refresh token sessions with device metadata
- **EmailVerificationToken:** Email verification tokens
- **PasswordResetToken:** Password reset tokens

## Environment Variables

See `.env.example` for all available configuration options.

## License

MIT
