import { Context } from "hono";
import { userService, UserService } from "../services/user.service";
import { AppError } from "../../auth/services/auth.service";
import { errorResponse } from "../../../utils/response";
import { ERROR_CODES, SUCCESS_CODES, USER_ERROR_MESSAGES } from "../../../constants";
import { AppEnv } from "../../../types";

export class UserController {
  constructor(private service: UserService = userService) {}

  listUsers = async (c: Context<AppEnv>) => {
    try {
      const prisma = c.get("prisma");
      const result = await this.service.listUsers(prisma);
      return c.json(result, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || USER_ERROR_MESSAGES.FETCH_USERS_FAILED
      );
    }
  };

  updateUser = async (c: Context<AppEnv>) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const currentUser = c.get("user");
      const prisma = c.get("prisma");

      if (!id) {
        return errorResponse(c, ERROR_CODES.BAD_REQUEST, USER_ERROR_MESSAGES.USER_ID_REQUIRED);
      }

      if (!currentUser?.id) {
        return errorResponse(c, ERROR_CODES.UNAUTHORIZED, USER_ERROR_MESSAGES.AUTH_REQUIRED);
      }

      const result = await this.service.updateUser(prisma, id, body, currentUser.id);
      return c.json(result, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || USER_ERROR_MESSAGES.UPDATE_USER_FAILED
      );
    }
  };

  updateRole = async (c: Context<AppEnv>) => {
    try {
      const id = c.req.param("id");
      const { role } = await c.req.json();
      const currentUser = c.get("user");
      const prisma = c.get("prisma");

      if (!id) {
        return errorResponse(c, ERROR_CODES.BAD_REQUEST, USER_ERROR_MESSAGES.USER_ID_REQUIRED);
      }

      if (!currentUser?.id) {
        return errorResponse(c, ERROR_CODES.UNAUTHORIZED, USER_ERROR_MESSAGES.AUTH_REQUIRED);
      }

      const result = await this.service.updateRole(prisma, id, role, currentUser.id);
      return c.json(result, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || USER_ERROR_MESSAGES.UPDATE_ROLE_FAILED
      );
    }
  };

  deleteUser = async (c: Context<AppEnv>) => {
    try {
      const id = c.req.param("id");
      const currentUser = c.get("user");
      const prisma = c.get("prisma");

      if (!id) {
        return errorResponse(c, ERROR_CODES.BAD_REQUEST, USER_ERROR_MESSAGES.USER_ID_REQUIRED);
      }

      if (!currentUser?.id) {
        return errorResponse(c, ERROR_CODES.UNAUTHORIZED, USER_ERROR_MESSAGES.AUTH_REQUIRED);
      }

      const result = await this.service.deleteUser(prisma, id, currentUser.id);
      return c.json(result, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || USER_ERROR_MESSAGES.DELETE_USER_FAILED
      );
    }
  };

  purgeDeletedUsers = async (c: Context<AppEnv>) => {
    try {
      const prisma = c.get("prisma");
      const result = await this.service.purgeExpiredDeletedUsers(prisma);
      return c.json(result, SUCCESS_CODES.OK);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(c, error.statusCode, error.message);
      }
      return errorResponse(
        c,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || USER_ERROR_MESSAGES.PURGE_FAILED
      );
    }
  };
}

export const userController = new UserController();
