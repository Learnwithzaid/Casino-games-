import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken,
  verifyToken,
} from '../utils/crypto';

describe('Crypto Utils', () => {
  describe('Password hashing', () => {
    it('should hash password successfully', async () => {
      const password = 'Password123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'Password123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, password);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Password123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, wrongPassword);

      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'Password123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Token generation', () => {
    it('should generate secure token', () => {
      const token = generateSecureToken();

      expect(token).toBeDefined();
      expect(token.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('Token hashing', () => {
    it('should hash token successfully', async () => {
      const token = generateSecureToken();
      const hash = await hashToken(token);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(token);
    });

    it('should verify correct token', async () => {
      const token = generateSecureToken();
      const hash = await hashToken(token);
      const isValid = await verifyToken(hash, token);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect token', async () => {
      const token = generateSecureToken();
      const wrongToken = generateSecureToken();
      const hash = await hashToken(token);
      const isValid = await verifyToken(hash, wrongToken);

      expect(isValid).toBe(false);
    });
  });
});
