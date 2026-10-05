import { ERROR_CODES, AUTH_ERROR_MESSAGES } from "../constants";
import { AppError } from "../modules/auth/services/auth.service";

interface LockoutRecord {
  failedCount: number;
  lockedUntil: number | null;
}

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

class LoginLockoutManager {
  private accountStore = new Map<string, LockoutRecord>();
  private ipStore = new Map<string, LockoutRecord>();

  constructor() {
    // Garbage collection every 10 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.accountStore.entries()) {
        if (record.lockedUntil && now > record.lockedUntil) {
          this.accountStore.delete(key);
        }
      }
      for (const [key, record] of this.ipStore.entries()) {
        if (record.lockedUntil && now > record.lockedUntil) {
          this.ipStore.delete(key);
        }
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Asserts whether an email or IP address is currently locked out
   */
  assertNotLocked(email: string, clientIp: string): void {
    const now = Date.now();
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check account-based lockout
    const accountRecord = this.accountStore.get(normalizedEmail);
    if (accountRecord?.lockedUntil && now < accountRecord.lockedUntil) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((accountRecord.lockedUntil - now) / 60000)
      );
      throw new AppError(
        ERROR_CODES.TOO_MANY_REQUESTS,
        AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED(remainingMinutes)
      );
    }

    // 2. Check IP-based lockout
    const ipRecord = this.ipStore.get(clientIp);
    if (ipRecord?.lockedUntil && now < ipRecord.lockedUntil) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((ipRecord.lockedUntil - now) / 60000)
      );
      throw new AppError(
        ERROR_CODES.TOO_MANY_REQUESTS,
        `Too many failed attempts from your IP. Temporary 5-minute lockout in effect (${remainingMinutes} min remaining).`
      );
    }
  }

  /**
   * Records a failed login attempt for both the target email and client IP
   */
  recordFailure(email: string, clientIp: string): { remainingAttempts: number; isLocked: boolean } {
    const now = Date.now();
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Process account failure count
    let accountRecord = this.accountStore.get(normalizedEmail);
    if (!accountRecord || (accountRecord.lockedUntil && now > accountRecord.lockedUntil)) {
      accountRecord = { failedCount: 0, lockedUntil: null };
      this.accountStore.set(normalizedEmail, accountRecord);
    }
    accountRecord.failedCount += 1;

    // 2. Process IP failure count
    let ipRecord = this.ipStore.get(clientIp);
    if (!ipRecord || (ipRecord.lockedUntil && now > ipRecord.lockedUntil)) {
      ipRecord = { failedCount: 0, lockedUntil: null };
      this.ipStore.set(clientIp, ipRecord);
    }
    ipRecord.failedCount += 1;

    // Check if account exceeded max attempts
    if (accountRecord.failedCount >= MAX_FAILED_ATTEMPTS) {
      accountRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
      accountRecord.failedCount = 0; // reset for next cycle after lockout
      console.warn(`[Security Alert] Account ${normalizedEmail} locked for 5 minutes after 3 failed login attempts.`);
    }

    // Check if IP exceeded max attempts
    if (ipRecord.failedCount >= MAX_FAILED_ATTEMPTS) {
      ipRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
      ipRecord.failedCount = 0;
      console.warn(`[Security Alert] IP ${clientIp} locked for 5 minutes after 3 failed login attempts.`);
    }

    const isLocked = Boolean(accountRecord.lockedUntil || ipRecord.lockedUntil);
    const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - accountRecord.failedCount);

    return {
      remainingAttempts,
      isLocked,
    };
  }

  /**
   * Resets failed login attempts upon successful authentication
   */
  recordSuccess(email: string, clientIp: string): void {
    const normalizedEmail = email.trim().toLowerCase();
    this.accountStore.delete(normalizedEmail);
    this.ipStore.delete(clientIp);
  }
}

export const loginLockoutManager = new LoginLockoutManager();
