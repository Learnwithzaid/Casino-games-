# Slot Machine UI - Documentation

## Overview

A fully-featured, responsive slot machine game built with React, TypeScript, Tailwind CSS, and Framer Motion. Features animated reels, sound effects, mobile responsiveness, and comprehensive error handling.

## Architecture

### Client (`apps/client`)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom slot-themed design system
- **Animations**: Framer Motion for 60fps spinning reels and celebrations
- **State Management**: Zustand for global game state
- **Audio**: Web Audio API for sound effects (muted by default on mobile)
- **PWA**: Progressive Web App support with offline capabilities

### Server (`apps/server`)
- **Framework**: Fastify + TypeScript
- **Database**: Prisma + SQLite
- **Authentication**: JWT-based (simplified for demo)
- **Wallet Integration**: Atomic transaction handling

## Key Features

### 🎰 Game Mechanics
- 3x3 slot reel grid with 10 unique symbols
- 8 paylines (horizontal, vertical, diagonal)
- Weighted symbol probabilities (common → legendary)
- Multipliers based on symbol rarity
- Real-time balance updates

### 🎨 Visual Design
- **Color Scheme**: Dark theme with gold accents
- **Symbols**: Emoji-based for cross-platform compatibility
- **Animations**: Smooth 60fps spinning with cascading reel effects
- **Celebrations**: Win animations with particle effects
- **Responsive**: Mobile-first design with desktop enhancements

### 🔊 Audio System
- **Sound Effects**: Web Audio API generated sounds
- **Mobile Friendly**: Auto-muted on mobile devices
- **User Control**: Toggle sound on/off
- **Fallback**: Graceful degradation when audio fails

### 📱 Mobile Responsiveness
- Touch-friendly controls
- Adaptive layout (sidebar → bottom controls on mobile)
- PWA installation support
- Performance optimized for mobile devices

### ♿ Accessibility
- Keyboard navigation (SPACE to spin, ESC to close menus)
- ARIA live regions for win announcements
- High contrast mode support
- Focus management and screen reader support

### 🛡️ Error Handling
- Error boundaries with user-friendly fallbacks
- Network connectivity monitoring
- Auto-logout on session expiry
- Retry logic with exponential backoff

## API Endpoints

### GET `/api/user/balance`
```typescript
// Response
{
  success: true,
  data: {
    userId: string,
    currency: string,
    balance: string
  }
}
```

### POST `/api/game/bet`
```typescript
// Request
{
  amount: number,
  gameRoundId?: string
}

// Response
{
  success: true,
  data: {
    transactionId: string,
    newBalance: string,
    spinResult: {
      id: string,
      symbols: SlotSymbol[][],
      betAmount: number,
      winAmount: number,
      winLines: PayLine[],
      isWin: boolean
    }
  }
}
```

### GET `/api/game/history`
```typescript
// Query Parameters
{
  page?: number,
  limit?: number
}

// Response
{
  success: true,
  spins: SpinResult[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

## Component Structure

```
src/
├── components/
│   ├── Reel.tsx                    # Individual reel component
│   ├── PaylineOverlay.tsx          # Win line visualization
│   ├── GameControls.tsx            # Bet selector, spin button
│   ├── SlotMachine.tsx             # Main game container
│   ├── GameHistory.tsx             # History view
│   ├── ErrorBoundary.tsx           # Error handling
│   ├── LoadingSkeleton.tsx         # Loading states
│   └── __tests__/                  # Component tests
├── store/
│   └── gameStore.ts                # Zustand state management
├── index.css                       # Global styles + animations
└── App.tsx                         # Main app component
```

## State Management

### Game Store Structure
```typescript
interface GameState {
  // User data
  userId: string | null;
  balance: string;
  currency: string;
  
  // Game state
  isSpinning: boolean;
  lastSpinResult: SpinResult | null;
  gameHistory: SpinResult[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  
  // Betting
  currentBet: number;
  betAmounts: number[];
  maxBet: number;
}
```

## Symbol System

| Symbol | Emoji | Rarity | Value | Probability |
|--------|-------|--------|-------|-------------|
| Cherry | 🍒 | Common | 2x | 40% |
| Lemon | 🍋 | Common | 3x | 30% |
| Orange | 🍊 | Common | 4x | 15% |
| Plum | 🍇 | Common | 5x | 8% |
| Grape | 🍇 | Common | 6x | 4% |
| Bell | 🔔 | Rare | 8x | 1.5% |
| Seven | 7️⃣ | Rare | 10x | 1% |
| Star | ⭐ | Epic | 15x | 0.3% |
| Diamond | 💎 | Legendary | 25x | 0.1% |
| Gold | 🥇 | Legendary | 50x | 0.1% |

## Payline System

8 predefined paylines:
- 3 horizontal lines (rows 1-3)
- 3 vertical lines (columns 1-3)  
- 2 diagonal lines

Winning combinations require all 3 symbols in a payline to match.

## Testing

### Unit Tests
- **Reel Component**: Symbol rendering, spinning animation, prop handling
- **GameControls**: Bet selection, spin logic, error handling
- **Store**: State management, API integration, persistence

### Integration Tests
- End-to-end spin flow
- Balance updates and transactions
- Error handling and recovery
- Mobile responsiveness

### Coverage Requirements
- Minimum 70% coverage across all metrics
- All critical paths tested
- Error scenarios covered

## Performance

### Lighthouse Scores (Target)
- **Performance**: 90+
- **Accessibility**: 90+
- **Best Practices**: 90+
- **SEO**: 90+
- **PWA**: 80+

### Optimization Techniques
- Code splitting by feature
- Lazy loading of components
- Optimized animations (transform-based)
- Service Worker caching
- Image optimization
- Bundle size optimization

## Setup and Development

### Prerequisites
- Node.js 18+
- Yarn package manager

### Installation
```bash
# Install dependencies
yarn install

# Start development servers
yarn dev:client  # Client on http://localhost:5173
yarn dev:server  # Server on http://localhost:3000
```

### Build and Test
```bash
# Build all applications
yarn build

# Run client tests
yarn test:client

# Run server tests
yarn test:server

# Run Lighthouse audit
yarn lighthouse
```

### Environment Variables
```bash
# Client (.env.local)
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Lucky Slots
VITE_APP_VERSION=1.0.0

# Server (.env)
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

## Deployment

### Client Deployment
1. Build optimized bundle: `yarn build:client`
2. Deploy static files to CDN/hosting
3. Configure environment variables
4. Set up PWA service worker

### Server Deployment
1. Build TypeScript: `yarn build:server`
2. Deploy to Node.js hosting
3. Set up database migrations
4. Configure environment variables

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Mobile**: iOS Safari 14+, Chrome Mobile 88+
- **Features**: ES2015+, CSS Grid, Flexbox, Web Audio API, Service Workers

## Troubleshooting

### Common Issues

1. **Audio not working on iOS**
   - Ensure user interaction before audio
   - Check iOS Safari audio policies

2. **Animations stuttering on mobile**
   - Reduce animation complexity
   - Use `will-change` CSS property
   - Enable hardware acceleration

3. **API connection issues**
   - Check CORS configuration
   - Verify environment variables
   - Monitor network connectivity

### Debug Mode
Set `NODE_ENV=development` for detailed logging and debugging tools.

## Contributing

1. Follow TypeScript strict mode
2. Maintain test coverage above 70%
3. Use semantic commit messages
4. Update documentation for new features
5. Test on mobile devices

## License

MIT License - see LICENSE file for details.