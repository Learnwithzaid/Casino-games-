import { Request, Response } from 'express';
import { WalletService } from '../services/WalletService';
import { TransactionType, TransactionStatus } from '../types';

export class GameController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async placeBet(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { amount, gameRoundId } = req.body;

    if (!amount || !gameRoundId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and gameRoundId are required',
      });
    }

    const result = await this.walletService.betDebit(
      userId,
      parseFloat(amount),
      gameRoundId
    );

    res.json({
      success: true,
      data: result,
    });
  }

  async creditWin(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { amount, gameRoundId } = req.body;

    if (amount === undefined || !gameRoundId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and gameRoundId are required',
      });
    }

    const result = await this.walletService.winCredit(
      userId,
      parseFloat(amount),
      gameRoundId
    );

    res.json({
      success: true,
      data: result,
    });
  }

  async getHistory(req: Request, res: Response) {
    const userId = req.user!.userId;
    const {
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter: any = {};
    if (type) filter.type = type as TransactionType;
    if (status) filter.status = status as TransactionStatus;
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const result = await this.walletService.getUserTransactionHistory(
      userId,
      filter,
      {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      }
    );

    res.json({
      success: true,
      ...result,
    });
  }
}
