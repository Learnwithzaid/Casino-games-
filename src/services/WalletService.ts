import { AppDataSource } from '../config/database';
import { Wallet } from '../entities/Wallet';
import { Transaction } from '../entities/Transaction';
import { Ledger } from '../entities/Ledger';
import { Settings } from '../entities/Settings';
import {
  TransactionType,
  TransactionStatus,
  CorrelationType,
  WalletOperationResult,
  TransactionFilter,
  PaginationOptions,
} from '../types';
import {
  InsufficientFundsError,
  LimitExceededError,
  WalletNotFoundError,
  ValidationError,
  ConcurrentModificationError,
} from '../utils/errors';
import { QueryRunner } from 'typeorm';

export class WalletService {
  private walletRepository = AppDataSource.getRepository(Wallet);
  private transactionRepository = AppDataSource.getRepository(Transaction);
  private ledgerRepository = AppDataSource.getRepository(Ledger);
  private settingsRepository = AppDataSource.getRepository(Settings);

  async getOrCreateWallet(userId: string, currency = 'USD'): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    
    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        balance: 0,
        currency,
      });
      await this.walletRepository.save(wallet);
    }
    
    return wallet;
  }

  async betDebit(
    userId: string,
    amount: number,
    gameRoundId: string
  ): Promise<WalletOperationResult> {
    if (amount <= 0) {
      throw new ValidationError('Bet amount must be positive');
    }

    const maxBetAmount = await this.getSetting('MAX_BET_AMOUNT', '10000');
    if (amount > parseFloat(maxBetAmount)) {
      throw new LimitExceededError(
        `Bet amount ${amount} exceeds maximum allowed ${maxBetAmount}`
      );
    }

    return this.executeWalletOperation(
      userId,
      -amount,
      TransactionType.BET,
      {
        gameRoundId,
        correlationId: gameRoundId,
        correlationType: CorrelationType.GAME_ROUND,
        description: `Bet placed for game round ${gameRoundId}`,
      }
    );
  }

  async winCredit(
    userId: string,
    amount: number,
    gameRoundId: string
  ): Promise<WalletOperationResult> {
    if (amount < 0) {
      throw new ValidationError('Win amount cannot be negative');
    }

    return this.executeWalletOperation(
      userId,
      amount,
      TransactionType.WIN,
      {
        gameRoundId,
        correlationId: gameRoundId,
        correlationType: CorrelationType.GAME_ROUND,
        description: `Win credited for game round ${gameRoundId}`,
      }
    );
  }

  async deposit(
    userId: string,
    amount: number,
    paymentWebhookId: string
  ): Promise<WalletOperationResult> {
    if (amount <= 0) {
      throw new ValidationError('Deposit amount must be positive');
    }

    const maxDepositAmount = await this.getSetting('MAX_DEPOSIT_AMOUNT', '50000');
    if (amount > parseFloat(maxDepositAmount)) {
      throw new LimitExceededError(
        `Deposit amount ${amount} exceeds maximum allowed ${maxDepositAmount}`
      );
    }

    return this.executeWalletOperation(
      userId,
      amount,
      TransactionType.DEPOSIT,
      {
        paymentWebhookId,
        correlationId: paymentWebhookId,
        correlationType: CorrelationType.PAYMENT_WEBHOOK,
        description: `Deposit via payment webhook ${paymentWebhookId}`,
      }
    );
  }

  async withdrawal(
    userId: string,
    amount: number,
    paymentWebhookId: string
  ): Promise<WalletOperationResult> {
    if (amount <= 0) {
      throw new ValidationError('Withdrawal amount must be positive');
    }

    const minWithdrawalAmount = await this.getSetting('MIN_WITHDRAWAL_AMOUNT', '10');
    if (amount < parseFloat(minWithdrawalAmount)) {
      throw new LimitExceededError(
        `Withdrawal amount ${amount} is below minimum allowed ${minWithdrawalAmount}`
      );
    }

    return this.executeWalletOperation(
      userId,
      -amount,
      TransactionType.WITHDRAWAL,
      {
        paymentWebhookId,
        correlationId: paymentWebhookId,
        correlationType: CorrelationType.PAYMENT_WEBHOOK,
        description: `Withdrawal via payment webhook ${paymentWebhookId}`,
      }
    );
  }

  async adjustment(
    userId: string,
    amount: number,
    reason: string,
    adminId: string
  ): Promise<WalletOperationResult> {
    if (amount === 0) {
      throw new ValidationError('Adjustment amount cannot be zero');
    }

    return this.executeWalletOperation(
      userId,
      amount,
      TransactionType.ADJUSTMENT,
      {
        correlationId: adminId,
        correlationType: CorrelationType.ADMIN_ADJUSTMENT,
        description: reason,
        metadata: { adminId, reason },
      }
    );
  }

  private async executeWalletOperation(
    userId: string,
    amount: number,
    type: TransactionType,
    options: {
      gameRoundId?: string;
      paymentWebhookId?: string;
      correlationId?: string;
      correlationType?: CorrelationType;
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<WalletOperationResult> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new WalletNotFoundError(`Wallet not found for user ${userId}`);
      }

      const balanceBefore = parseFloat(wallet.balance.toString());
      const balanceAfter = balanceBefore + amount;

      if (balanceAfter < 0) {
        throw new InsufficientFundsError(
          `Insufficient funds. Current balance: ${balanceBefore}, required: ${Math.abs(amount)}`
        );
      }

      wallet.balance = balanceAfter;
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        userId,
        amount,
        type,
        status: TransactionStatus.COMPLETED,
        gameRoundId: options.gameRoundId,
        paymentWebhookId: options.paymentWebhookId,
        balanceBefore,
        balanceAfter,
        description: options.description,
      });
      await queryRunner.manager.save(transaction);

      const ledgerEntry = queryRunner.manager.create(Ledger, {
        transactionId: transaction.id,
        walletId: wallet.id,
        userId,
        type,
        amount,
        status: TransactionStatus.COMPLETED,
        correlationId: options.correlationId,
        correlationType: options.correlationType,
        balanceBefore,
        balanceAfter,
        metadata: options.metadata,
      });
      await queryRunner.manager.save(ledgerEntry);

      await queryRunner.commitTransaction();

      console.log(`[AUDIT] User ${userId} - ${type} - Amount: ${amount} - Balance: ${balanceBefore} -> ${balanceAfter}`);

      return {
        success: true,
        transactionId: transaction.id,
        balanceBefore,
        balanceAfter,
        message: `${type} operation completed successfully`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      if (error instanceof Error && error.message.includes('optimistic lock')) {
        throw new ConcurrentModificationError();
      }
      
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getBalance(userId: string): Promise<{ balance: number; currency: string }> {
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    
    if (!wallet) {
      throw new WalletNotFoundError(`Wallet not found for user ${userId}`);
    }

    return {
      balance: parseFloat(wallet.balance.toString()),
      currency: wallet.currency,
    };
  }

  async getUserTransactionHistory(
    userId: string,
    filter: TransactionFilter,
    pagination: PaginationOptions
  ) {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .orderBy('transaction.createdAt', 'DESC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit);

    if (filter.type) {
      query.andWhere('transaction.type = :type', { type: filter.type });
    }

    if (filter.status) {
      query.andWhere('transaction.status = :status', { status: filter.status });
    }

    if (filter.startDate) {
      query.andWhere('transaction.createdAt >= :startDate', {
        startDate: filter.startDate,
      });
    }

    if (filter.endDate) {
      query.andWhere('transaction.createdAt <= :endDate', {
        endDate: filter.endDate,
      });
    }

    const [transactions, total] = await query.getManyAndCount();

    return {
      data: transactions.map((t) => ({
        id: t.id,
        amount: parseFloat(t.amount.toString()),
        type: t.type,
        status: t.status,
        balanceBefore: parseFloat(t.balanceBefore.toString()),
        balanceAfter: parseFloat(t.balanceAfter.toString()),
        description: t.description,
        gameRoundId: t.gameRoundId,
        paymentWebhookId: t.paymentWebhookId,
        createdAt: t.createdAt,
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async getAllTransactions(
    filter: TransactionFilter & { userId?: string },
    pagination: PaginationOptions
  ) {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .orderBy('transaction.createdAt', 'DESC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit);

    if (filter.userId) {
      query.andWhere('transaction.userId = :userId', { userId: filter.userId });
    }

    if (filter.type) {
      query.andWhere('transaction.type = :type', { type: filter.type });
    }

    if (filter.status) {
      query.andWhere('transaction.status = :status', { status: filter.status });
    }

    if (filter.startDate) {
      query.andWhere('transaction.createdAt >= :startDate', {
        startDate: filter.startDate,
      });
    }

    if (filter.endDate) {
      query.andWhere('transaction.createdAt <= :endDate', {
        endDate: filter.endDate,
      });
    }

    const [transactions, total] = await query.getManyAndCount();

    return {
      data: transactions.map((t) => ({
        id: t.id,
        userId: t.userId,
        walletId: t.walletId,
        amount: parseFloat(t.amount.toString()),
        type: t.type,
        status: t.status,
        balanceBefore: parseFloat(t.balanceBefore.toString()),
        balanceAfter: parseFloat(t.balanceAfter.toString()),
        description: t.description,
        gameRoundId: t.gameRoundId,
        paymentWebhookId: t.paymentWebhookId,
        createdAt: t.createdAt,
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  private async getSetting(key: string, defaultValue: string): Promise<string> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting ? setting.value : defaultValue;
  }

  async setSetting(key: string, value: string, description?: string): Promise<void> {
    let setting = await this.settingsRepository.findOne({ where: { key } });
    
    if (setting) {
      setting.value = value;
      if (description) {
        setting.description = description;
      }
    } else {
      setting = this.settingsRepository.create({ key, value, description });
    }
    
    await this.settingsRepository.save(setting);
  }
}
