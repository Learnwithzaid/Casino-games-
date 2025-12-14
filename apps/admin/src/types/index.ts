export interface AdminUser {
  id: string;
  email: string;
  role: 'Admin' | 'SuperAdmin';
  name?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface AdminSession {
  token: string;
  refreshToken?: string;
  user: AdminUser;
  expiresAt: Date;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: AdminUser;
}

export interface TOTPSetupResponse {
  secret: string;
  qrCode: string;
}

export interface TOTPVerifyRequest {
  code: string;
  secret?: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  provider: string;
  type: string;
  rtp: number;
  isActive: boolean;
  minBet: number;
  maxBet: number;
  maxWin: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameSymbol {
  id: string;
  gameId: string;
  symbol: string;
  multiplier: number;
  isScatter: boolean;
  isWild: boolean;
  isBonus: boolean;
  weight: number;
}

export interface UserProfile {
  id: string;
  role: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, any>;
  createdAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
