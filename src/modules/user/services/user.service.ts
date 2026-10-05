import { PrismaClient, Role } from "@prisma/client";
import { userRepository, UserRepository, UpdateUserData } from "../repositories/user.repository";
import { AppError } from "../../auth/services/auth.service";
import {
  ROLES,
  VALID_ROLES,
  ERROR_CODES,
  USER_ERROR_MESSAGES,
  USER_SUCCESS_MESSAGES,
  AUTH_ERROR_MESSAGES,
} from "../../../constants";

export class UserService {
  constructor(private repo: UserRepository = userRepository) {}

  async listUsers(prisma: PrismaClient) {
    const userList = await this.repo.findAll(prisma);
    return {
      total: userList.length,
      users: userList,
    };
  }

  async updateRole(
    prisma: PrismaClient,
    targetUserId: string,
    role: any,
    currentUserId: string
  ) {
    if (!role || !VALID_ROLES.includes(role)) {
      throw new AppError(
        ERROR_CODES.BAD_REQUEST,
        USER_ERROR_MESSAGES.INVALID_ROLE(VALID_ROLES)
      );
    }

    const existing = await this.repo.findById(prisma, targetUserId);
    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, USER_ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Prevent a superadmin from demoting themselves if they are the only superadmin
    if (existing.id === currentUserId && role !== ROLES.SUPERADMIN) {
      const superAdminCount = await this.repo.countSuperAdmins(prisma, ROLES.SUPERADMIN as Role);
      if (superAdminCount <= 1) {
        throw new AppError(
          ERROR_CODES.BAD_REQUEST,
          USER_ERROR_MESSAGES.CANNOT_DEMOTE_LAST_SUPERADMIN(ROLES.SUPERADMIN)
        );
      }
    }

    const updated = await this.repo.updateRole(prisma, targetUserId, role as Role);

    return {
      message: USER_SUCCESS_MESSAGES.ROLE_UPDATED(role),
      user: updated,
    };
  }

  async updateUser(
    prisma: PrismaClient,
    targetUserId: string,
    payload: {
      name?: string | null;
      email?: string;
      role?: any;
      isVerified?: boolean;
      deletedAt?: Date | null;
    },
    currentUserId: string
  ) {
    const existing = await this.repo.findById(prisma, targetUserId);
    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, USER_ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const updateData: UpdateUserData = {};

    if (payload.name !== undefined) {
      updateData.name = payload.name ? String(payload.name).trim() : null;
    }

    if (payload.email !== undefined) {
      const normalizedEmail = String(payload.email).trim().toLowerCase();
      if (normalizedEmail !== existing.email) {
        const emailTaken = await this.repo.findByEmail(prisma, normalizedEmail);
        if (emailTaken) {
          throw new AppError(ERROR_CODES.CONFLICT, AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS);
        }
      }
      updateData.email = normalizedEmail;
    }

    if (payload.role !== undefined) {
      if (!VALID_ROLES.includes(payload.role)) {
        throw new AppError(
          ERROR_CODES.BAD_REQUEST,
          USER_ERROR_MESSAGES.INVALID_ROLE(VALID_ROLES)
        );
      }

      if (existing.id === currentUserId && payload.role !== ROLES.SUPERADMIN) {
        const superAdminCount = await this.repo.countSuperAdmins(prisma, ROLES.SUPERADMIN as Role);
        if (superAdminCount <= 1) {
          throw new AppError(
            ERROR_CODES.BAD_REQUEST,
            USER_ERROR_MESSAGES.CANNOT_DEMOTE_LAST_SUPERADMIN(ROLES.SUPERADMIN)
          );
        }
      }
      updateData.role = payload.role as Role;
    }

    if (payload.isVerified !== undefined) {
      updateData.isVerified = Boolean(payload.isVerified);
    }

    if (payload.deletedAt !== undefined) {
      updateData.deletedAt = payload.deletedAt;
    }

    const updated = await this.repo.updateUser(prisma, targetUserId, updateData);

    return {
      message: USER_SUCCESS_MESSAGES.USER_UPDATED,
      user: updated,
    };
  }

  async deleteUser(
    prisma: PrismaClient,
    targetUserId: string,
    currentUserId: string
  ) {
    if (targetUserId === currentUserId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, USER_ERROR_MESSAGES.CANNOT_DELETE_OWN_ACCOUNT);
    }

    const existing = await this.repo.findById(prisma, targetUserId);
    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, USER_ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (existing.role === ROLES.SUPERADMIN) {
      const superAdminCount = await this.repo.countSuperAdmins(prisma, ROLES.SUPERADMIN as Role);
      if (superAdminCount <= 1) {
        throw new AppError(
          ERROR_CODES.BAD_REQUEST,
          USER_ERROR_MESSAGES.CANNOT_DEMOTE_LAST_SUPERADMIN(ROLES.SUPERADMIN)
        );
      }
    }

    await this.repo.delete(prisma, targetUserId);

    return {
      message: USER_SUCCESS_MESSAGES.USER_DELETED(existing.email),
    };
  }

  async purgeExpiredDeletedUsers(prisma: PrismaClient) {
    // 7 days (1 week) ago cutoff
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await this.repo.purgeExpiredDeletedUsers(prisma, oneWeekAgo);

    return {
      message: USER_SUCCESS_MESSAGES.USERS_PURGED(result.count),
      purgedCount: result.count,
    };
  }
}

export const userService = new UserService();
