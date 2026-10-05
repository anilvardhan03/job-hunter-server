import { PrismaClient, Role, User } from "@prisma/client";

export interface UpdateUserData {
  name?: string | null;
  email?: string;
  role?: Role;
  isVerified?: boolean;
  deletedAt?: Date | null;
}

export class UserRepository {
  async findAll(prisma: PrismaClient) {
    return prisma.user.findMany({
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
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(prisma: PrismaClient, id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(prisma: PrismaClient, email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async countSuperAdmins(prisma: PrismaClient, role: Role): Promise<number> {
    return prisma.user.count({
      where: { role, deletedAt: null },
    });
  }

  async updateUser(prisma: PrismaClient, id: string, data: UpdateUserData) {
    return prisma.user.update({
      where: { id },
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

  async updateRole(prisma: PrismaClient, id: string, role: Role) {
    return prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        deletedAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(prisma: PrismaClient, id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  async purgeExpiredDeletedUsers(prisma: PrismaClient, cutoffDate: Date) {
    return prisma.user.deleteMany({
      where: {
        deletedAt: {
          lte: cutoffDate,
        },
      },
    });
  }
}

export const userRepository = new UserRepository();
