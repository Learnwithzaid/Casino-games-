export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface HealthCheckResponse {
  uptime: number;
  message: string;
  timestamp: number;
  environment: string;
  database?: string;
}

// Slot Machine Types
export interface SlotSymbol {
  id: string;
  name: string;
  emoji: string;
  value: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface ReelPosition {
  symbol: SlotSymbol;
  row: number;
  column: number;
}

export interface SpinResult {
  id: string;
  userId: string;
  symbols: SlotSymbol[][];
  betAmount: number;
  winAmount: number;
  winLines: PayLine[];
  timestamp: Date;
  isWin: boolean;
}

export interface PayLine {
  id: string;
  positions: Array<{ row: number; column: number }>;
  multiplier: number;
  symbol: SlotSymbol;
  winAmount: number;
}

export interface GameSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  totalSpins: number;
  totalBets: number;
  totalWins: number;
  balance: number;
}

export interface BalanceResponse {
  userId: string;
  currency: string;
  balance: string;
}

export interface BetRequest {
  amount: number;
  gameRoundId?: string;
}

export interface BetResponse {
  success: boolean;
  data?: {
    transactionId: string;
    newBalance: string;
    spinResult: SpinResult;
  };
  message?: string;
}

export interface GameHistory {
  spins: SpinResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserSettings {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  autoSpinEnabled: boolean;
  betAmount: number;
  maxBetAmount: number;
}
