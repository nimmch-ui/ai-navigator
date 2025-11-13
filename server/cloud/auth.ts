import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export interface HashedPassword {
  hash: string;
  salt: string;
}

export function hashPassword(password: string): HashedPassword {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  
  return { hash, salt };
}

export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  try {
    const hash = scryptSync(password, storedSalt, 64);
    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    
    return timingSafeEqual(hash, storedHashBuffer);
  } catch (error) {
    console.error('[Auth] Password verification error:', error);
    return false;
  }
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}
