import { Hono } from "hono";
import { authenticate, requireSuperAdmin } from "../middleware/auth";
import { Role } from "@prisma/client";
import { AppEnv } from "../types";

const users = new Hono<AppEnv>();

// All routes require SUPERADMIN role
users.use(authenticate);
users.use(requireSuperAdmin);

// 1. List all users
users.get("/", async (c) => {
  try {
    const prisma = c.get("prisma");
    const userList = await prisma.user.findMany({
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

    return c.json({
      total: userList.length,
      users: userList,
    });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to fetch users" }, 500);
  }
});

// 2. Update user role (only SUPERADMIN or USER allowed)
users.patch("/:id/role", async (c) => {
  try {
    const id = c.req.param("id");
    const { role } = await c.req.json();
    const currentUser = c.get("user");
    const prisma = c.get("prisma");

    if (!role || !Object.values(Role).includes(role)) {
      return c.json(
        { error: `Invalid role. Allowed roles are: ${Object.values(Role).join(", ")}` },
        400
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }

    // Prevent a superadmin from demoting themselves if they are the only superadmin
    if (existing.id === currentUser.id && role !== "SUPERADMIN") {
      const superAdminCount = await prisma.user.count({
        where: { role: "SUPERADMIN" },
      });
      if (superAdminCount <= 1) {
        return c.json(
          { error: "Cannot demote yourself as the only remaining SUPERADMIN" },
          400
        );
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

    return c.json({
      message: `User role updated to ${role}`,
      user: updated,
    });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to update role" }, 500);
  }
});

// 3. Delete a user
users.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");
    const prisma = c.get("prisma");

    if (id === currentUser.id) {
      return c.json({ error: "Cannot delete your own account" }, 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }

    await prisma.user.delete({ where: { id } });

    return c.json({ message: `User ${existing.email} deleted successfully` });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to delete user" }, 500);
  }
});

export default users;
