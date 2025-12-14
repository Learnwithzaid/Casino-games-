import { Request, Response } from 'express';
import { WalletService } from '../services/WalletService';
import { TransactionType, TransactionStatus } from '../types';

export class UserController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async getBalance(req: Request, res: Response) {
    const userId = req.user!.userId;
    
    const result = await this.walletService.getBalance(userId);
    
    res.json({
      success: true,
      data: result,
    });
  }

  async deposit(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { amount, paymentWebhookId } = req.body;

    if (!amount || !paymentWebhookId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and paymentWebhookId are required',
      });
    }

    const result = await this.walletService.deposit(
      userId,
      parseFloat(amount),
      paymentWebhookId
    );

    res.json({
      success: true,
      data: result,
    });
  }

  async withdrawal(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { amount, paymentWebhookId } = req.body;

    if (!amount || !paymentWebhookId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and paymentWebhookId are required',
      });
    }

    const result = await this.walletService.withdrawal(
      userId,
      parseFloat(amount),
      paymentWebhookId
    );

    res.json({
      success: true,
      data: result,
    });
  }
}
