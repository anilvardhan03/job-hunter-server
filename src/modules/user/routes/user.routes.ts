import { Hono } from "hono";
import { userController } from "../controllers/user.controller";
import { authenticate, requireSuperAdmin } from "../../../middleware/auth";
import { AppEnv } from "../../../types";

const userRoutes = new Hono<AppEnv>();

// All user management routes require authentication and SUPERADMIN role
userRoutes.use(authenticate);
userRoutes.use(requireSuperAdmin);

// 1. List all users
userRoutes.get("/", userController.listUsers);

// 2. Superadmin updates user (name, email, role, isVerified, deletedAt)
userRoutes.put("/:id", userController.updateUser);
userRoutes.patch("/:id", userController.updateUser);

// 3. Update user role
userRoutes.patch("/:id/role", userController.updateRole);

// 4. Delete a user (hard delete)
userRoutes.delete("/:id", userController.deleteUser);

// 5. Purge users whose soft-deletion is older than 1 week
userRoutes.post("/purge-deleted", userController.purgeDeletedUsers);

export default userRoutes;
