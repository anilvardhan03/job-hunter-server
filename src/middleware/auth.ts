import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/auth";
import prisma from "../db";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization token required (Bearer <token>)" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Ensure user still exists in the database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    res.status(401).json({ error: "User no longer exists" });
    return;
  }

  req.user = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  next();
}

export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.role !== "SUPERADMIN") {
    res.status(403).json({ error: "Access denied. SUPERADMIN role required." });
    return;
  }

  next();
}
