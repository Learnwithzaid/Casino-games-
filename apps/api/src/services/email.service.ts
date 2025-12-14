export interface EmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log('=== EMAIL ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log('=============');
  }
}

class EmailService {
  private provider: EmailProvider;

  constructor(provider?: EmailProvider) {
    this.provider = provider || new ConsoleEmailProvider();
  }

  setProvider(provider: EmailProvider): void {
    this.provider = provider;
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const subject = 'Verify your email address';
    const body = `
      Please verify your email address by clicking the link below:
      
      ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, please ignore this email.
    `;
    
    await this.provider.sendEmail(email, subject, body);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const subject = 'Reset your password';
    const body = `
      You requested to reset your password. Click the link below to reset it:
      
      ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
    `;
    
    await this.provider.sendEmail(email, subject, body);
  }

  async sendAccountLockedEmail(email: string, unlockTime: Date): Promise<void> {
    const subject = 'Account temporarily locked';
    const body = `
      Your account has been temporarily locked due to too many failed login attempts.
      
      Your account will be unlocked at: ${unlockTime.toISOString()}
      
      If you didn't attempt to log in, please contact support immediately.
    `;
    
    await this.provider.sendEmail(email, subject, body);
  }

  async send2FAEnabledEmail(email: string): Promise<void> {
    const subject = 'Two-factor authentication enabled';
    const body = `
      Two-factor authentication has been enabled on your account.
      
      If you didn't enable 2FA, please contact support immediately.
    `;
    
    await this.provider.sendEmail(email, subject, body);
  }
}

export const emailService = new EmailService();
