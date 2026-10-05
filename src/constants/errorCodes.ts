/**
 * Standard HTTP Error Status Codes and Application Error Messages
 */

// 4xx & 5xx Error Status Codes
export const ERROR_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ErrorStatusCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Mapping of numeric error status codes to phrases
export const ERROR_STATUS_NAMES: Record<number, string> = {
  // 4xx Client Errors
  [ERROR_CODES.BAD_REQUEST]: "Bad Request",
  [ERROR_CODES.UNAUTHORIZED]: "Unauthorized",
  [ERROR_CODES.FORBIDDEN]: "Forbidden",
  [ERROR_CODES.NOT_FOUND]: "Not Found",
  [ERROR_CODES.CONFLICT]: "Conflict",
  [ERROR_CODES.UNPROCESSABLE_ENTITY]: "Unprocessable Entity",
  [ERROR_CODES.TOO_MANY_REQUESTS]: "Too Many Requests",

  // 5xx Server Errors
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: "Internal Server Error",
  [ERROR_CODES.BAD_GATEWAY]: "Bad Gateway",
  [ERROR_CODES.SERVICE_UNAVAILABLE]: "Service Unavailable",
};

// Common Authentication & Authorization Error Messages
export const AUTH_ERROR_MESSAGES = {
  TOKEN_REQUIRED: "Authorization token required (Bearer <token>)",
  INVALID_OR_EXPIRED_TOKEN: "Invalid or expired token",
  USER_NOT_FOUND: "User no longer exists",
  AUTH_REQUIRED: "Authentication required",
  SUPERADMIN_REQUIRED: "Access denied. SUPERADMIN role required.",
  EMAIL_REQUIRED: "Email is required",
  EMAIL_PASSWORD_REQUIRED: "Email and password are required",
  PASSWORD_TOO_SHORT: "Password must be at least 6 characters long",
  USER_ALREADY_EXISTS: "User with this email already exists",
  USER_NOT_FOUND_WITH_EMAIL: "User not found with this email",
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_NOT_VERIFIED:
    "Please verify your email address before logging in. Check your inbox for the verification link or request a new one.",
  EMAIL_ALREADY_VERIFIED: "This email is already verified. You can log in.",
  VERIFICATION_TOKEN_REQUIRED: "Verification token is required",
  INVALID_VERIFICATION_TOKEN: "Invalid verification token",
  VERIFICATION_TOKEN_EXPIRED:
    "Verification token has expired. Please request a new verification link.",
  REGISTER_FAILED: "Failed to register user",
  LOGIN_FAILED: "Failed to login",
  VERIFY_EMAIL_FAILED: "Failed to verify email",
  RESEND_VERIFICATION_FAILED: "Failed to resend verification email",
  PROFILE_FAILED: "Failed to retrieve user profile",
  UPDATE_PROFILE_FAILED: "Failed to update profile",
  DELETE_PROFILE_FAILED: "Failed to delete account",
  ACCOUNT_DELETED:
    "Your account has been scheduled for deletion and is deactivated. If you wish to restore it, please contact support.",
  CANNOT_DELETE_LAST_SUPERADMIN: "Cannot delete yourself as the only remaining SUPERADMIN",
  ACCOUNT_LOCKED: (remainingMinutes: number) =>
    `Too many failed login attempts. Account temporarily locked for ${remainingMinutes} minute(s). Please try again later.`,
} as const;

// Common User Management Error Messages
export const USER_ERROR_MESSAGES = {
  USER_ID_REQUIRED: "User ID is required",
  USER_NOT_FOUND: "User not found",
  AUTH_REQUIRED: "Authentication required",
  CANNOT_DELETE_OWN_ACCOUNT: "Cannot delete your own account",
  CANNOT_DEMOTE_LAST_SUPERADMIN: (role: string = "SUPERADMIN") =>
    `Cannot demote yourself as the only remaining ${role}`,
  INVALID_ROLE: (roles: readonly string[] | string[]) =>
    `Invalid role. Allowed roles are: ${roles.join(", ")}`,
  FETCH_USERS_FAILED: "Failed to fetch users",
  UPDATE_USER_FAILED: "Failed to update user",
  UPDATE_ROLE_FAILED: "Failed to update role",
  DELETE_USER_FAILED: "Failed to delete user",
  PURGE_FAILED: "Failed to purge deleted users",
} as const;

// Common Security Error Messages
export const SECURITY_ERROR_MESSAGES = {
  SQL_INJECTION_DETECTED: "Invalid input or restricted query pattern detected",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
  PAYLOAD_TOO_LARGE: "Request payload exceeds maximum allowed size (100KB)",
  CORS_BLOCKED: "Cross-Origin request blocked by CORS security policy",
  IP_BLOCKED:
    "Access denied. Your IP address has been banned due to suspicious bot activity or vulnerability scanning.",
  BOT_PROBE_DETECTED: "Access denied: Malicious probe detected and IP blocked.",
} as const;

// Common Server Error Messages
export const SERVER_ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  DATABASE_URL_REQUIRED: "DATABASE_URL binding is required",
  ROUTE_NOT_FOUND: (method: string, path: string) => `Route not found: ${method} ${path}`,
} as const;

// Aggregated Error Messages
export const ERROR_MESSAGES = {
  AUTH: AUTH_ERROR_MESSAGES,
  USER: USER_ERROR_MESSAGES,
  SECURITY: SECURITY_ERROR_MESSAGES,
  SERVER: SERVER_ERROR_MESSAGES,
} as const;
