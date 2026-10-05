import { Context, Next } from "hono";
import { errorResponse } from "../utils/response";
import { ERROR_CODES, SECURITY_ERROR_MESSAGES } from "../constants";
import { AppEnv } from "../types";

export interface BannedIpEntry {
  bannedAt: number;
  expiresAt: number;
  reason: string;
}

/**
 * In-memory storage for banned malicious bot IPs.
 * Default ban duration: 24 hours.
 */
const bannedIps = new Map<string, BannedIpEntry>();

// Default ban duration: 24 hours (86,400,000 ms)
const DEFAULT_BAN_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Common bot / vulnerability scanner paths (honeypot targets)
 */
const MALICIOUS_PROBE_PATHS = [
  // Environment & config files
  /^\/\.env(\..+)?$/i,
  /^\/\.git(\/.*)?$/i,
  /^\/\.aws(\/.*)?$/i,
  /^\/config\.(json|yaml|yml|inc)$/i,
  /^\/web\.config$/i,
  /^\/\.htaccess$/i,
  /^\/\.htpasswd$/i,

  // CMS & Admin scanners
  /^\/wp-login\.php$/i,
  /^\/wp-admin(\/.*)?$/i,
  /^\/xmlrpc\.php$/i,
  /^\/wordpress(\/.*)?$/i,
  /^\/phpmyadmin(\/.*)?$/i,
  /^\/pma(\/.*)?$/i,
  /^\/adminer\.php$/i,
  /^\/mysql(\/.*)?$/i,

  // Spring, Java, & server probes
  /^\/actuator(\/.*)?$/i,
  /^\/server-status$/i,
  /^\/solr(\/.*)?$/i,
];

/**
 * Extensions that a clean REST API backend never serves and are indicators of automated scanners
 */
const SUSPICIOUS_EXTENSION_REGEX = /\.(env|php|asp|aspx|jsp|cgi|bak|sql|tar|gz|zip|conf|ini|rar)$/i;

/**
 * Determines whether a requested URL path is an automated malicious probe
 */
export function isMaliciousProbe(pathname: string): boolean {
  const normalizedPath = pathname.toLowerCase().trim();

  // 1. Check exact regex patterns
  for (const pattern of MALICIOUS_PROBE_PATHS) {
    if (pattern.test(normalizedPath)) {
      return true;
    }
  }

  // 2. Check for suspicious extensions (e.g. /index.php, /backup.sql)
  const pathWithoutQuery = normalizedPath.split("?")[0];
  if (SUSPICIOUS_EXTENSION_REGEX.test(pathWithoutQuery)) {
    return true;
  }

  return false;
}

/**
 * Helper to extract client IP address accurately from standard proxy headers
 */
export function getClientIp(c: Context<AppEnv>): string {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
    c.req.header("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Adds an IP to the blacklist with a specific ban duration
 */
export function banIp(ip: string, reason: string, durationMs: number = DEFAULT_BAN_DURATION_MS) {
  const now = Date.now();
  bannedIps.set(ip, {
    bannedAt: now,
    expiresAt: now + durationMs,
    reason,
  });
  console.warn(`[CYBERSECURITY FIREWALL] Banned malicious IP: ${ip} for ${durationMs / 60000} mins. Reason: ${reason}`);
}

/**
 * Checks whether an IP address is actively banned
 */
export function isIpBanned(ip: string): boolean {
  const entry = bannedIps.get(ip);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    bannedIps.delete(ip);
    return false;
  }

  return true;
}

let lastBansCleanup = Date.now();

function cleanupExpiredBans(now: number) {
  for (const [ip, entry] of bannedIps.entries()) {
    if (now > entry.expiresAt) {
      bannedIps.delete(ip);
    }
  }
}

/**
 * Firewall Middleware:
 * 1. Blocks currently banned IPs from accessing any endpoint.
 * 2. Catches bot probes on honeypot routes like /.env and instantly bans the offender IP.
 */
export async function botAndProbeBlocker(c: Context<AppEnv>, next: Next) {
  const now = Date.now();
  if (now - lastBansCleanup > 10 * 60 * 1000) {
    cleanupExpiredBans(now);
    lastBansCleanup = now;
  }

  const clientIp = getClientIp(c);
  const path = c.req.path;

  // 1. Check if the IP is already banned
  if (isIpBanned(clientIp)) {
    console.warn(`[CYBERSECURITY FIREWALL] Dropped request from banned IP: ${clientIp} to ${path}`);
    return errorResponse(c, ERROR_CODES.FORBIDDEN, SECURITY_ERROR_MESSAGES.IP_BLOCKED);
  }

  // 2. Check if the request is a bot probe / honeypot hit
  if (isMaliciousProbe(path)) {
    // Automatically ban this IP for 24 hours
    banIp(clientIp, `Vulnerability probe attempt on restricted path: ${path}`);
    return errorResponse(
      c,
      ERROR_CODES.FORBIDDEN,
      SECURITY_ERROR_MESSAGES.BOT_PROBE_DETECTED
    );
  }

  await next();
}
