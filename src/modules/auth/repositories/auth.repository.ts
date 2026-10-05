import { PrismaClient, Role, User } from "@prisma/client";
import { UserRecord } from "../../../types";

export interface CreateUserData {
  email: string;
  password: string;
  name?: string | null;
  role: Role;
  isVerified?: boolean;
  verificationToken?: string | null;
  verificationExpires?: Date | null;
}

export class AuthRepository {
  async findByEmail(prisma: PrismaClient, email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { email },
    }) as Promise<UserRecord | null>;
  }

  async findById(prisma: PrismaClient, id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { id },
    }) as Promise<UserRecord | null>;
  }

  async findByVerificationToken(prisma: PrismaClient, token: string): Promise<UserRecord | null> {
    return prisma.user.findFirst({
      where: { verificationToken: token },
    }) as Promise<UserRecord | null>;
  }

  async countSuperAdmins(prisma: PrismaClient): Promise<number> {
    return prisma.user.count({
      where: { role: Role.SUPERADMIN, deletedAt: null },
    });
  }

  async createUser(prisma: PrismaClient, data: CreateUserData) {
    return prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name ?? null,
        role: data.role,
        isVerified: data.isVerified ?? false,
        verificationToken: data.verificationToken,
        verificationExpires: data.verificationExpires,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });
  }

  async markEmailVerified(prisma: PrismaClient, userId: string): Promise<UserRecord> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
      },
    }) as Promise<UserRecord>;
  }

  async updateVerificationToken(
    prisma: PrismaClient,
    userId: string,
    verificationToken: string,
    verificationExpires: Date
  ): Promise<UserRecord> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        verificationToken,
        verificationExpires,
      },
    }) as Promise<UserRecord>;
  }

  async updateProfile(
    prisma: PrismaClient,
    userId: string,
    data: { name?: string | null; password?: string }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async softDelete(prisma: PrismaClient, userId: string, deletedAt: Date): Promise<UserRecord> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt,
      },
    }) as Promise<UserRecord>;
  }

  async getProfile(prisma: PrismaClient, userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

export const authRepository = new AuthRepository();
