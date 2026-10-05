import { Context } from "hono";
import {
  HTTP_STATUS_NAMES,
  SUCCESS_CODES,
  ERROR_CODES,
  SuccessStatusCode,
  ErrorStatusCode,
} from "../constants/statusCodes";

export * from "../constants/statusCodes";

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

export function errorResponse(
  c: Context<any>,
  statusCode: ErrorStatusCode | number,
  message: string
) {
  const errorName = HTTP_STATUS_NAMES[statusCode] || "Error";
  return c.json(
    {
      statusCode,
      error: errorName,
      message,
    },
    statusCode as any
  );
}

export function successResponse<T extends Record<string, any>>(
  c: Context<any>,
  data: T,
  statusCode: SuccessStatusCode = SUCCESS_CODES.OK
) {
  return c.json(
    {
      statusCode,
      ...data,
    },
    statusCode as any
  );
}
