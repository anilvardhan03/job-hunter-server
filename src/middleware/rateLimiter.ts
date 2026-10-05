import { Context, Next } from "hono";
import { errorResponse } from "../utils/response";
import { ERROR_CODES, SECURITY_ERROR_MESSAGES } from "../constants";
import { AppEnv } from "../types";

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitOptions {
  windowMs: number; // e.g., 60 * 1000 for 1 minute
  maxRequests: number; // max requests within windowMs
  message?: string;
  skipSuccessfulGets?: boolean;
}

/**
 * Creates an in-memory sliding window rate limiter middleware.
 * Includes periodic garbage collection of expired IP records to prevent memory leaks.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = SECURITY_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
  } = options;

  const storage = new Map<string, RateLimitRecord>();

  // Cleanup stale records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of storage.entries()) {
      record.timestamps = record.timestamps.filter((time) => now - time < windowMs);
      if (record.timestamps.length === 0) {
        storage.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  return async function rateLimiterMiddleware(c: Context<AppEnv>, next: Next) {
    // Extract client IP address
    const clientIp =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
      c.req.header("x-real-ip") ||
      "unknown-ip";

    const key = `${clientIp}:${c.req.path}`;
    const now = Date.now();

    let record = storage.get(key);
    if (!record) {
      record = { timestamps: [] };
      storage.set(key, record);
    }

    // Retain only timestamps within the current sliding window
    record.timestamps = record.timestamps.filter((time) => now - time < windowMs);

    const currentCount = record.timestamps.length;
    const remaining = Math.max(0, maxRequests - currentCount - 1);
    const oldestTimestamp = record.timestamps[0] || now;
    const resetTime = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.max(1, resetTime)));

    if (currentCount >= maxRequests) {
      c.header("Retry-After", String(Math.max(1, resetTime)));
      return errorResponse(c, ERROR_CODES.TOO_MANY_REQUESTS, message);
    }

    record.timestamps.push(now);
    await next();
  };
}

// Strict rate limiter for authentication endpoints: 15 requests / 15 minutes per IP
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: "Too many authentication attempts. Please wait 15 minutes before retrying.",
});

// Dedicated IP-based rate limiter for login: 5 requests / 5 minutes per IP
export const loginIpRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 5,
  message: "Too many login attempts from this IP address. Please wait 5 minutes before retrying.",
});

// General rate limiter: 120 requests / 1 minute per IP
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: SECURITY_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
});
