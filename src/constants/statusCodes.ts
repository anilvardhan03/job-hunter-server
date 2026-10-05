/**
 * Standard HTTP Status Codes and Reason Phrases
 * Re-exports error codes/messages and success codes/messages
 */

import { ERROR_CODES, ERROR_STATUS_NAMES } from "./errorCodes";
import { SUCCESS_CODES, SUCCESS_STATUS_NAMES } from "./successCodes";

export * from "./errorCodes";
export * from "./successCodes";

// Unified HTTP Status Codes
export const HTTP_STATUS = {
  ...SUCCESS_CODES,
  ...ERROR_CODES,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

// Mapping of numeric status codes to human-readable names / phrases
export const HTTP_STATUS_NAMES: Record<number, string> = {
  ...SUCCESS_STATUS_NAMES,
  ...ERROR_STATUS_NAMES,
};
