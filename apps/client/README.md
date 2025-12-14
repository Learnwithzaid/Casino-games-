# Client SPA - GameVault

A modern React single-page application built with Vite, TypeScript, and Tailwind CSS for the GameVault gaming platform.

## 🚀 Features

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for responsive design
- **React Router** with lazy loading and protected routes
- **Zustand** for state management
- **Axios** with interceptors for API calls
- **React Hook Form** for form handling
- **Vitest** for testing with coverage
- **ESLint & Prettier** for code quality

## 📁 Project Structure

```
src/
├── api/                  # API layer and HTTP client
│   ├── client.ts        # Axios instance with interceptors
│   └── endpoints.ts     # API endpoint definitions
├── components/          # Reusable UI components
│   ├── Layout.tsx       # Main layout wrapper
│   └── ProtectedRoute.tsx # Route protection
├── hooks/               # Custom React hooks
│   └── useAuth.ts       # Authentication hook
├── pages/               # Page components
│   ├── Login.tsx        # Login page
│   ├── Game.tsx         # Game center
│   ├── Profile.tsx      # User profile
│   ├── History.tsx      # Game & transaction history
│   └── Deposit.tsx      # Deposit funds
├── store/               # Zustand state stores
│   ├── authStore.ts     # Authentication state
│   ├── walletStore.ts   # Wallet & transactions
│   └── gameStore.ts     # Game state management
├── styles/              # Global styles
│   └── globals.css      # Tailwind + custom styles
├── test/                # Test utilities
│   └── setup.ts         # Test setup
├── types/               # TypeScript type definitions
│   └── index.ts         # Shared types
├── App.tsx              # Main app component
└── main.tsx             # App entry point
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```bash
VITE_API_URL=http://localhost:3000/api
VITE_NODE_ENV=development
VITE_APP_NAME=GameVault
VITE_APP_VERSION=1.0.0
```

## 🏃‍♂️ Development

### Start Development Server
```bash
npm run dev
```
Runs on `http://localhost:5173`

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint          # Check linting
npm run lint:fix      # Fix linting issues
```

### Formatting
```bash
npm run format
```

### Testing
```bash
npm run test          # Run tests with coverage
npm run test:watch    # Watch mode for development
```

### Building
```bash
npm run build         # Production build
npm run preview       # Preview production build
```

## 🎯 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |

## 🔒 Authentication & Routes

### Public Routes
- `/login` - User login

### Protected Routes (require authentication)
- `/game` - Main game interface
- `/profile` - User profile management
- `/history` - Game and transaction history
- `/deposit` - Deposit funds

### ProtectedRoute Component
Automatically redirects to `/login` if user is not authenticated.

## 🏪 State Management

### Auth Store (`useAuthStore`)
- User authentication state
- Login/logout functionality
- Token management with persistence
- JWT refresh handling

### Wallet Store (`useWalletStore`)
- Wallet balance
- Transaction history
- Deposit management

### Game Store (`useGameStore`)
- Current game state
- Game history
- Game actions (start/end)

## 🌐 API Integration

### API Client Features
- Automatic JWT token injection
- Request/response interceptors
- Automatic token refresh
- Centralized error handling
- Toast notifications for errors

### Environment Variables
- `VITE_API_URL` - Backend API base URL
- `VITE_NODE_ENV` - Environment mode
- `VITE_ENABLE_DEBUG` - Enable debug logging

## 🎨 Styling

### Tailwind CSS Configuration
- Custom color palette (primary, gray, success, danger)
- Custom font family (Inter)
- Responsive breakpoints
- Custom component classes

### Custom CSS Classes
- `.btn` - Base button styles
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.input` - Form input styles
- `.card` - Card container
- `.loading-spinner` - Loading animation

## 🧪 Testing

### Test Configuration
- **Framework**: Vitest
- **Assertions**: @testing-library/jest-dom
- **Coverage**: Minimum 70% threshold
- **Environment**: jsdom

### Test Structure
- Component tests in `__tests__` folders
- Test setup in `src/test/setup.ts`
- Mocked localStorage and fetch APIs

## 📦 Dependencies

### Core Dependencies
- **react** ^18.2.0 - UI library
- **react-dom** ^18.2.0 - React DOM
- **react-router-dom** ^6.20.0 - Routing
- **zustand** ^4.4.7 - State management
- **axios** ^1.6.2 - HTTP client
- **react-hook-form** ^7.48.2 - Form handling
- **react-hot-toast** ^2.4.1 - Notifications

### Development Dependencies
- **vite** ^5.0.7 - Build tool
- **typescript** ^5.3.2 - TypeScript
- **tailwindcss** ^3.3.6 - CSS framework
- **vitest** ^1.0.0 - Testing framework
- **@testing-library/react** ^13.4.0 - Testing utilities

## 🔧 Configuration Files

- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `vitest.config.ts` - Vitest configuration
- `.eslintrc.js` - ESLint configuration

## 🌟 Features Implemented

✅ React + Vite + TypeScript setup
✅ Tailwind CSS with custom design system
✅ React Router with lazy loading
✅ Protected route guards
✅ Zustand state management
✅ API layer with JWT handling
✅ React Hook Form integration
✅ Toast notifications
✅ Responsive design
✅ Testing setup with coverage
✅ ESLint + Prettier configuration
✅ Environment variable management

## 🚀 Next Steps

- [ ] Add Storybook for component documentation
- [ ] Implement PWA features
- [ ] Add offline support
- [ ] Implement real-time updates (WebSocket)
- [ ] Add e2e testing with Playwright
- [ ] Performance optimization and bundle analysis
- [ ] Add analytics integration

## 📄 License

Private repository - All rights reserved.
