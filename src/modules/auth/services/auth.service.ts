import { PrismaClient } from "@prisma/client";
import { authRepository, AuthRepository } from "../repositories/auth.repository";
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateVerificationToken,
} from "../utils/auth.utils";
import {
  sendVerificationEmail,
  sendAccountDeletionEmail,
} from "../../../services/email.service";
import { loginLockoutManager } from "../../../utils/loginLockout";
import { ROLES, ERROR_CODES, AUTH_ERROR_MESSAGES, AUTH_SUCCESS_MESSAGES } from "../../../constants";
import { Bindings } from "../../../types";

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export class AuthService {
  constructor(private repo: AuthRepository = authRepository) {}

  async register(
    prisma: PrismaClient,
    env: Bindings,
    payload: { email?: string; password?: string; name?: string; origin: string }
  ) {
    const { email, password, name, origin } = payload;

    if (!email || !password) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, AUTH_ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED);
    }

    if (typeof password !== "string" || password.length < 6) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, AUTH_ERROR_MESSAGES.PASSWORD_TOO_SHORT);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await this.repo.findByEmail(prisma, normalizedEmail);

    if (existing) {
      throw new AppError(ERROR_CODES.CONFLICT, AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS);
    }

    const hashedPassword = await hashPassword(password);
    const { token: verificationToken, expires: verificationExpires } = generateVerificationToken();

    const user = await this.repo.createUser(prisma, {
      email: normalizedEmail,
      password: hashedPassword,
      name: name ? String(name).trim() : null,
      role: ROLES.USER,
      isVerified: false,
      verificationToken,
      verificationExpires,
    });

    const verificationLink = `${origin}/api/auth/verify-email?token=${verificationToken}`;

    // Send verification email in background
    sendVerificationEmail({
      toEmail: user.email,
      toName: user.name,
      verificationLink,
      apiKey: env.BREVO_API_KEY,
      senderEmail: env.BREVO_SENDER_EMAIL,
      senderName: env.BREVO_SENDER_NAME,
    }).catch((err) => {
      console.error("[AuthService] Failed to dispatch verification email:", err);
    });

    return {
      message: AUTH_SUCCESS_MESSAGES.REGISTER_SUCCESS,
      user,
    };
  }

  async verifyEmail(prisma: PrismaClient, token?: string) {
    if (!token) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, AUTH_ERROR_MESSAGES.VERIFICATION_TOKEN_REQUIRED);
    }

    const user = await this.repo.findByVerificationToken(prisma, token);

    if (!user) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_TOKEN);
    }

    if (user.verificationExpires && user.verificationExpires < new Date()) {
      throw new AppError(
        ERROR_CODES.BAD_REQUEST,
        AUTH_ERROR_MESSAGES.VERIFICATION_TOKEN_EXPIRED
      );
    }

    await this.repo.markEmailVerified(prisma, user.id);

    return {
      message: AUTH_SUCCESS_MESSAGES.VERIFY_EMAIL_SUCCESS,
    };
  }

  async resendVerification(
    prisma: PrismaClient,
    env: Bindings,
    payload: { email?: string; origin: string }
  ) {
    const { email, origin } = payload;

    if (!email) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, AUTH_ERROR_MESSAGES.EMAIL_REQUIRED);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await this.repo.findByEmail(prisma, normalizedEmail);

    if (!user) {
      throw new AppError(ERROR_CODES.NOT_FOUND, AUTH_ERROR_MESSAGES.USER_NOT_FOUND_WITH_EMAIL);
    }

    if (user.isVerified) {
      return {
        message: AUTH_ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED,
      };
    }

    const { token: verificationToken, expires: verificationExpires } = generateVerificationToken();
    await this.repo.updateVerificationToken(prisma, user.id, verificationToken, verificationExpires);

    const verificationLink = `${origin}/api/auth/verify-email?token=${verificationToken}`;

    await sendVerificationEmail({
      toEmail: user.email,
      toName: user.name,
      verificationLink,
      apiKey: env.BREVO_API_KEY,
      senderEmail: env.BREVO_SENDER_EMAIL,
      senderName: env.BREVO_SENDER_NAME,
    });

    return {
      message: AUTH_SUCCESS_MESSAGES.RESEND_VERIFICATION_SUCCESS,
    };
  }

  async login(
    prisma: PrismaClient,
    env: Bindings,
    payload: { email?: string; password?: string; clientIp?: string }
  ) {
    const { email, password, clientIp = "127.0.0.1" } = payload;

    if (!email || !password) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, AUTH_ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Check if the account or client IP is locked out
    loginLockoutManager.assertNotLocked(normalizedEmail, clientIp);

    const user = await this.repo.findByEmail(prisma, normalizedEmail);

    if (!user) {
      const { remainingAttempts, isLocked } = loginLockoutManager.recordFailure(
        normalizedEmail,
        clientIp
      );
      if (isLocked) {
        throw new AppError(ERROR_CODES.TOO_MANY_REQUESTS, AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED(5));
      }
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        `${AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS}. ${remainingAttempts} attempt(s) remaining before 5-minute lockout.`
      );
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      const { remainingAttempts, isLocked } = loginLockoutManager.recordFailure(
        normalizedEmail,
        clientIp
      );
      if (isLocked) {
        throw new AppError(ERROR_CODES.TOO_MANY_REQUESTS, AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED(5));
      }
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        `${AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS}. ${remainingAttempts} attempt(s) remaining before 5-minute lockout.`
      );
    }

    if (!user.isVerified) {
      throw new AppError(ERROR_CODES.FORBIDDEN, AUTH_ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
    }

    if (user.deletedAt) {
      throw new AppError(ERROR_CODES.FORBIDDEN, AUTH_ERROR_MESSAGES.ACCOUNT_DELETED);
    }

    // Login successful: reset failed attempt counters
    loginLockoutManager.recordSuccess(normalizedEmail, clientIp);

    const token = generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN || "7d"
    );

    return {
      message: AUTH_SUCCESS_MESSAGES.LOGIN_SUCCESS,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    };
  }

  async getProfile(prisma: PrismaClient, userId: string) {
    const user = await this.repo.getProfile(prisma, userId);

    if (!user) {
      throw new AppError(ERROR_CODES.NOT_FOUND, AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return { user };
  }

  async updateProfile(
    prisma: PrismaClient,
    userId: string,
    payload: { name?: string; password?: string }
  ) {
    const { name, password } = payload;
    const user = await this.repo.findById(prisma, userId);

    if (!user) {
      throw new AppError(ERROR_CODES.NOT_FOUND, AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (user.deletedAt) {
      throw new AppError(ERROR_CODES.FORBIDDEN, AUTH_ERROR_MESSAGES.ACCOUNT_DELETED);
    }

    const updateData: { name?: string | null; password?: string } = {};

    if (name !== undefined) {
      updateData.name = name ? String(name).trim() : null;
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 6) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, AUTH_ERROR_MESSAGES.PASSWORD_TOO_SHORT);
      }
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await this.repo.updateProfile(prisma, userId, updateData);

    return {
      message: AUTH_SUCCESS_MESSAGES.PROFILE_UPDATED,
      user: updatedUser,
    };
  }

  async deleteProfile(prisma: PrismaClient, env: Bindings, userId: string) {
    const user = await this.repo.findById(prisma, userId);

    if (!user) {
      throw new AppError(ERROR_CODES.NOT_FOUND, AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (user.deletedAt) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, AUTH_ERROR_MESSAGES.ACCOUNT_DELETED);
    }

    // Prevent deleting the only remaining SUPERADMIN
    if (user.role === ROLES.SUPERADMIN) {
      const superAdminCount = await this.repo.countSuperAdmins(prisma);
      if (superAdminCount <= 1) {
        throw new AppError(
          ERROR_CODES.BAD_REQUEST,
          AUTH_ERROR_MESSAGES.CANNOT_DELETE_LAST_SUPERADMIN
        );
      }
    }

    const deletedAt = new Date();
    const scheduledPermanentDeletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.repo.softDelete(prisma, userId, deletedAt);

    // Trigger account deletion confirmation email in background
    sendAccountDeletionEmail({
      toEmail: user.email,
      toName: user.name,
      scheduledPermanentDeletionDate,
      apiKey: env.BREVO_API_KEY,
      senderEmail: env.BREVO_SENDER_EMAIL,
      senderName: env.BREVO_SENDER_NAME,
    }).catch((err) => {
      console.error("[AuthService] Failed to dispatch account deletion email:", err);
    });

    return {
      message: AUTH_SUCCESS_MESSAGES.ACCOUNT_DELETION_SCHEDULED,
      scheduledPermanentDeletion: scheduledPermanentDeletionDate,
    };
  }
}

export const authService = new AuthService();
