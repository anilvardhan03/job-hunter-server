import { Context, Next } from "hono";
import { errorResponse } from "../utils/response";
import { ERROR_CODES, SECURITY_ERROR_MESSAGES } from "../constants";
import { AppEnv } from "../types";

/**
 * Common SQL injection attack signatures to scan for in query params and raw payload strings
 */
const SQLI_PATTERNS = [
  /(\b(UNION(\s+ALL)?)\s+SELECT\b)/i,
  /(\b(DROP|ALTER|TRUNCATE)\s+TABLE\b)/i,
  /(\b(INSERT\s+INTO|DELETE\s+FROM)\b)/i,
  /(\bEXEC(\s+|\s*\()\b)/i,
  /(\b(WAITFOR\s+DELAY|SLEEP\s*\()\b)/i,
  /('|\b)(OR|AND)\s+('?1'?\s*=\s*'?[1|true]|\d+\s*=\s*\d+)/i,
  /(--|\/\*|\*\/|;\s*--)/,
];

/**
 * Common XSS attack signatures to strip from string inputs
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:[^\s"'>]*/gi,
  /vbscript:[^\s"'>]*/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^"'\s>]+/gi,
];

/**
 * Sanitizes a single string against XSS, null-byte injection, and dangerous tags
 */
export function sanitizeString(val: string): string {
  if (typeof val !== "string") return val;

  // Remove null bytes
  let sanitized = val.replace(/\0/g, "");

  // Strip known XSS payloads and script tags
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized.trim();
}

/**
 * Recursively cleans an object/array of prototype pollution and XSS vectors
 */
export function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return sanitizeString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj as Record<string, any>)) {
      // Prototype pollution prevention
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        continue;
      }
      cleaned[key] = sanitizePayload((obj as Record<string, any>)[key]);
    }
    return cleaned as T;
  }

  return obj;
}

/**
 * Inspects a string value to detect SQL injection attempts
 */
export function hasSqlInjection(val: string): boolean {
  if (typeof val !== "string") return false;
  return SQLI_PATTERNS.some((pattern) => pattern.test(val));
}

/**
 * Middleware: Scans query parameters, path variables, and request body for SQL injection & XSS
 */
export async function securitySanitizer(c: Context<AppEnv>, next: Next) {
  // 1. Check query parameters
  const queries = c.req.queries();
  for (const [key, values] of Object.entries(queries)) {
    for (const value of values) {
      if (hasSqlInjection(value)) {
        console.warn(`[Security Alert] Potential SQL injection detected in query param '${key}': ${value}`);
        return errorResponse(c, ERROR_CODES.BAD_REQUEST, SECURITY_ERROR_MESSAGES.SQL_INJECTION_DETECTED);
      }
    }
  }

  // 2. Validate URL param ID format if present (:id)
  const paramId = c.req.param("id");
  if (paramId && !/^[a-zA-Z0-9_\-]+$/.test(paramId)) {
    return errorResponse(c, ERROR_CODES.BAD_REQUEST, "Invalid identifier format");
  }

  // 3. For mutation requests with JSON, check SQL injection and sanitize XSS
  const method = c.req.method.toUpperCase();
  const contentType = c.req.header("content-type") || "";

  if (["POST", "PUT", "PATCH"].includes(method) && contentType.includes("application/json")) {
    try {
      const rawText = await c.req.text();
      if (rawText && rawText.trim().length > 0) {
        if (hasSqlInjection(rawText)) {
          console.warn(`[Security Alert] Potential SQL injection in request body: ${rawText.slice(0, 100)}`);
          return errorResponse(c, ERROR_CODES.BAD_REQUEST, SECURITY_ERROR_MESSAGES.SQL_INJECTION_DETECTED);
        }

        const parsed = JSON.parse(rawText);
        const sanitized = sanitizePayload(parsed);

        // Re-inject sanitized JSON body so subsequent c.req.json() calls receive the clean data
        c.req.json = async () => sanitized;
      }
    } catch {
      // If parsing fails, let standard validation or handler handle the error
    }
  }

  await next();
}

/**
 * Configurable secure CORS middleware
 */
export function createSecureCors(configuredOrigins: string[] = []) {
  const defaultDevOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  ];

  const allowedList = configuredOrigins.length > 0 ? configuredOrigins : defaultDevOrigins;

  return async function secureCorsMiddleware(c: Context<AppEnv>, next: Next) {
    const origin = c.req.header("origin");

    // If request has no Origin header (e.g., mobile app, same-origin, curl, Postman), allow through
    if (!origin) {
      await next();
      return;
    }

    const isAllowed =
      allowedList.includes(origin) ||
      (process.env.NODE_ENV !== "production" &&
        (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")));

    if (isAllowed) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Access-Control-Allow-Credentials", "true");
      c.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
      );
      c.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, Accept, Origin"
      );
      c.header("Access-Control-Max-Age", "86400"); // 24 hours
      c.header("Vary", "Origin");
    } else {
      // Cross-origin request from an untrusted origin
      if (c.req.method.toUpperCase() === "OPTIONS") {
        return errorResponse(c, ERROR_CODES.FORBIDDEN, SECURITY_ERROR_MESSAGES.CORS_BLOCKED);
      }
    }

    // Handle preflight OPTIONS request
    if (c.req.method.toUpperCase() === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  };
}
