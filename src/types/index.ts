export enum TransactionType {
  BET = 'bet',
  WIN = 'win',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  ADJUSTMENT = 'adjustment',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum CorrelationType {
  GAME_ROUND = 'game_round',
  PAYMENT_WEBHOOK = 'payment_webhook',
  ADMIN_ADJUSTMENT = 'admin_adjustment',
}

export interface WalletOperationResult {
  success: boolean;
  transactionId: string;
  balanceBefore: number;
  balanceAfter: number;
  message?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface TransactionFilter {
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface AuthUser {
  userId: string;
  role: 'user' | 'admin';
}
