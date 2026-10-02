import { Context, Next } from "hono";
import { verifyToken } from "../utils/auth";
import { AppEnv } from "../types";

export async function authenticate(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authorization token required (Bearer <token>)" }, 401);
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const prisma = c.get("prisma");
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    return c.json({ error: "User no longer exists" }, 401);
  }

  c.set("user", user);
  await next();
}

export async function requireSuperAdmin(c: Context<AppEnv>, next: Next) {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }

  if (user.role !== "SUPERADMIN") {
    return c.json({ error: "Access denied. SUPERADMIN role required." }, 403);
  }

  await next();
}
