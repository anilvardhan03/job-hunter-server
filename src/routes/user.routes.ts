import { Router, Response } from "express";
import prisma from "../db";
import { authenticate, requireSuperAdmin, AuthenticatedRequest } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

// All routes in this router require SUPERADMIN role
router.use(authenticate);
router.use(requireSuperAdmin);

// 1. List all users
router.get("/", async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      total: users.length,
      users,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch users" });
  }
});

// 2. Update user role (only SUPERADMIN or USER allowed)
router.patch("/:id/role", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(Role).includes(role)) {
      res.status(400).json({
        error: `Invalid role. Allowed roles are: ${Object.values(Role).join(", ")}`,
      });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Prevent a superadmin from demoting themselves if they are the only superadmin
    if (existing.id === req.user!.userId && role !== "SUPERADMIN") {
      const superAdminCount = await prisma.user.count({
        where: { role: "SUPERADMIN" },
      });
      if (superAdminCount <= 1) {
        res.status(400).json({
          error: "Cannot demote yourself as the only remaining SUPERADMIN",
        });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    res.json({
      message: `User role updated to ${role}`,
      user: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update role" });
  }
});

// 3. Delete a user
router.delete("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (id === req.user!.userId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: `User ${existing.email} deleted successfully` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete user" });
  }
});

export default router;
