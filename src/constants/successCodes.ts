/**
 * Standard HTTP Success Status Codes and Application Success Messages
 */

// 2xx Success Status Codes
export const SUCCESS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
} as const;

export type SuccessStatusCode = (typeof SUCCESS_CODES)[keyof typeof SUCCESS_CODES];

// Mapping of numeric success status codes to phrases
export const SUCCESS_STATUS_NAMES: Record<number, string> = {
  [SUCCESS_CODES.OK]: "OK",
  [SUCCESS_CODES.CREATED]: "Created",
  [SUCCESS_CODES.ACCEPTED]: "Accepted",
  [SUCCESS_CODES.NO_CONTENT]: "No Content",
};

// Common Authentication Success Messages
export const AUTH_SUCCESS_MESSAGES = {
  REGISTER_SUCCESS:
    "Registration successful. Please verify your email address to activate your account.",
  VERIFY_EMAIL_SUCCESS: "Email verified successfully. You can now log in.",
  RESEND_VERIFICATION_SUCCESS:
    "Verification email resent successfully. Please check your inbox.",
  LOGIN_SUCCESS: "Login successful",
  PROFILE_UPDATED: "Profile updated successfully",
  ACCOUNT_DELETION_SCHEDULED:
    "Account scheduled for permanent deletion in 7 days. A confirmation email has been sent to your address.",
} as const;

// Common User Management Success Messages
export const USER_SUCCESS_MESSAGES = {
  ROLE_UPDATED: (role: string) => `User role updated to ${role}`,
  USER_UPDATED: "User updated successfully",
  USER_DELETED: (email: string) => `User ${email} deleted successfully`,
  USERS_PURGED: (count: number) => `Successfully purged ${count} expired deleted user(s)`,
} as const;

// Aggregated Success Messages
export const SUCCESS_MESSAGES = {
  AUTH: AUTH_SUCCESS_MESSAGES,
  USER: USER_SUCCESS_MESSAGES,
} as const;
