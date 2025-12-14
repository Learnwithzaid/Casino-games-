import { Request, Response } from 'express';
import { WalletService } from '../services/WalletService';
import { TransactionType, TransactionStatus } from '../types';

export class AdminController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async getTransactions(req: Request, res: Response) {
    const {
      userId,
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter: any = {};
    if (userId) filter.userId = userId as string;
    if (type) filter.type = type as TransactionType;
    if (status) filter.status = status as TransactionStatus;
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const result = await this.walletService.getAllTransactions(filter, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      ...result,
    });
  }

  async getUserBalance(req: Request, res: Response) {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    const result = await this.walletService.getBalance(userId);

    res.json({
      success: true,
      data: result,
    });
  }

  async makeAdjustment(req: Request, res: Response) {
    const adminId = req.user!.userId;
    const { userId, amount, reason } = req.body;

    if (!userId || amount === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'userId, amount, and reason are required',
      });
    }

    const result = await this.walletService.adjustment(
      userId,
      parseFloat(amount),
      reason,
      adminId
    );

    res.json({
      success: true,
      data: result,
    });
  }

  async updateSettings(req: Request, res: Response) {
    const { key, value, description } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        success: false,
        message: 'key and value are required',
      });
    }

    await this.walletService.setSetting(key, value, description);

    res.json({
      success: true,
      message: 'Setting updated successfully',
    });
  }
}
