import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}

export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

export async function hashToken(token: string): Promise<string> {
  return argon2.hash(token);
}

export async function verifyToken(hash: string, token: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, token);
  } catch (error) {
    return false;
  }
}
