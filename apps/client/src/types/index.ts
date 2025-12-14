export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface WalletBalance {
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface GameState {
  currentGame: Game | null;
  gameHistory: Game[];
  isPlaying: boolean;
}

export interface Game {
  id: string;
  type: string;
  status: 'pending' | 'playing' | 'completed' | 'cancelled';
  amount: number;
  result?: 'win' | 'lose' | 'draw';
  createdAt: string;
  completedAt?: string;
}

export interface Deposit {
  id: string;
  amount: number;
  method: 'card' | 'bank' | 'crypto';
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
