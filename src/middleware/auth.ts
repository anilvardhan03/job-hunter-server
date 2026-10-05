import { Context, Next } from "hono";
import { verifyToken } from "../utils/auth";
import { errorResponse } from "../utils/response";
import { ROLES, ERROR_CODES, AUTH_ERROR_MESSAGES } from "../constants";
import { AppEnv } from "../types";

export async function authenticate(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(c, ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_MESSAGES.TOKEN_REQUIRED);
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return errorResponse(c, ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
  }

  const prisma = c.get("prisma");
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, deletedAt: true },
  });

  if (!user) {
    return errorResponse(c, ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
  }

  if (user.deletedAt) {
    return errorResponse(c, ERROR_CODES.FORBIDDEN, AUTH_ERROR_MESSAGES.ACCOUNT_DELETED);
  }

  c.set("user", user);
  await next();
}

export async function requireSuperAdmin(c: Context<AppEnv>, next: Next) {
  const user = c.get("user");

  if (!user) {
    return errorResponse(c, ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_MESSAGES.AUTH_REQUIRED);
  }

  if (user.role !== ROLES.SUPERADMIN) {
    return errorResponse(c, ERROR_CODES.FORBIDDEN, AUTH_ERROR_MESSAGES.SUPERADMIN_REQUIRED);
  }

  await next();
}
