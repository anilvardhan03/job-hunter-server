import { Hono } from "hono";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { authenticate } from "../middleware/auth";
import { AppEnv } from "../types";

const auth = new Hono<AppEnv>();

// Register a new user
auth.post("/register", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    if (typeof password !== "string" || password.length < 6) {
      return c.json({ error: "Password must be at least 6 characters long" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const prisma = c.get("prisma");

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return c.json({ error: "User with this email already exists" }, 409);
    }

    // If this is the very first user registered, automatically make them SUPERADMIN
    const totalUsers = await prisma.user.count();
    const role = totalUsers === 0 ? "SUPERADMIN" : "USER";

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name ? String(name).trim() : null,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const token = generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      c.env.JWT_SECRET,
      c.env.JWT_EXPIRES_IN || "7d"
    );

    return c.json(
      {
        message: "User registered successfully",
        token,
        user,
      },
      201
    );
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to register user" }, 500);
  }
});

// Login
auth.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const prisma = c.get("prisma");

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const token = generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      c.env.JWT_SECRET,
      c.env.JWT_EXPIRES_IN || "7d"
    );

    return c.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to login" }, 500);
  }
});

// Get current user profile
auth.get("/me", authenticate, async (c) => {
  try {
    const authUser = c.get("user");
    const prisma = c.get("prisma");

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ user });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to retrieve user profile" }, 500);
  }
});

export default auth;
