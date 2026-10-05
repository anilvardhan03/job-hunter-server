import { Context } from "hono";
import { authService, AuthService, AppError } from "../services/auth.service";
import { errorResponse } from "../../../utils/response";
import { ERROR_CODES, SUCCESS_CODES, AUTH_ERROR_MESSAGES } from "../../../constants";
import { AppEnv } from "../../../types";

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (c: Context<AppEnv>) => {
    try {
      const body = await c.req.json();
      const origin = new URL(c.req.url).origin;
      const prisma = c.get("prisma");

      const result = await this.service.register(prisma, c.env, {
        email: body.email,
        password: body.password,
        name: body.name,
        origin,
      });

      return c.json(result, SUCCESS_CODES.CREATED);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || AUTH_ERROR_MESSAGES.REGISTER_FAILED
      );
    }
  };

  verifyEmail = async (c: Context<AppEnv>) => {
    try {
      const token = c.req.query("token");
      const prisma = c.get("prisma");

      const result = await this.service.verifyEmail(prisma, token);
      return c.json({ statusCode: SUCCESS_CODES.OK, ...result }, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || AUTH_ERROR_MESSAGES.VERIFY_EMAIL_FAILED
      );
    }
  };

  resendVerification = async (c: Context<AppEnv>) => {
    try {
      const body = await c.req.json();
      const origin = new URL(c.req.url).origin;
      const prisma = c.get("prisma");

      const result = await this.service.resendVerification(prisma, c.env, {
        email: body.email,
        origin,
      });

      return c.json({ statusCode: SUCCESS_CODES.OK, ...result }, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || AUTH_ERROR_MESSAGES.RESEND_VERIFICATION_FAILED
      );
    }
  };

  login = async (c: Context<AppEnv>) => {
    try {
      const body = await c.req.json();
      const prisma = c.get("prisma");
      const clientIp =
        c.req.header("cf-connecting-ip") ||
        c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
        c.req.header("x-real-ip") ||
        "127.0.0.1";

      const result = await this.service.login(prisma, c.env, {
        email: body.email,
        password: body.password,
        clientIp,
      });

      return c.json(result, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || AUTH_ERROR_MESSAGES.LOGIN_FAILED
      );
    }
  };

  getProfile = async (c: Context<AppEnv>) => {
    try {
      const authUser = c.get("user");
      const prisma = c.get("prisma");

      const result = await this.service.getProfile(prisma, authUser.id);
      return c.json(result, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || AUTH_ERROR_MESSAGES.PROFILE_FAILED
      );
    }
  };

  updateProfile = async (c: Context<AppEnv>) => {
    try {
      const authUser = c.get("user");
      const prisma = c.get("prisma");
      const body = await c.req.json();

      const result = await this.service.updateProfile(prisma, authUser.id, {
        name: body.name,
        password: body.password,
      });

      return c.json(result, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || AUTH_ERROR_MESSAGES.UPDATE_PROFILE_FAILED
      );
    }
  };

  deleteProfile = async (c: Context<AppEnv>) => {
    try {
      const authUser = c.get("user");
      const prisma = c.get("prisma");

      const result = await this.service.deleteProfile(prisma, c.env, authUser.id);
      return c.json(result, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || AUTH_ERROR_MESSAGES.DELETE_PROFILE_FAILED
      );
    }
  };
}

export const authController = new AuthController();
