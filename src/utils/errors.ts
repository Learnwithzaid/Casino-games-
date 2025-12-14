export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message = 'Insufficient funds') {
    super(400, message);
  }
}

export class LimitExceededError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class WalletNotFoundError extends AppError {
  constructor(message = 'Wallet not found') {
    super(404, message);
  }
}

export class ConcurrentModificationError extends AppError {
  constructor(message = 'Concurrent modification detected, please retry') {
    super(409, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}
