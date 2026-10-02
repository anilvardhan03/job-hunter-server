import { Hono } from "hono";
import { cors } from "hono/cors";
import { getPrisma } from "./db";
import { AppEnv } from "./types";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import docsRoutes from "./routes/docs.routes";

const app = new Hono<AppEnv>();

// 1. Global CORS Middleware
app.use("*", cors());

// 2. Attach PrismaClient with Neon Serverless adapter to every request
app.use("*", async (c, next) => {
  const dbUrl = c.env.DATABASE_URL;
  if (!dbUrl) {
    return c.json({ error: "DATABASE_URL binding is required" }, 500);
  }
  c.set("prisma", getPrisma(dbUrl));
  await next();
});

// 3. Root Endpoint
app.get("/", (c) => {
  return c.json({
    message: "Job Hunter Server is working!",
    status: "UP",
    runtime: "cloudflare-workers",
    environment: c.env.ENVIRONMENT || "development",
    endpoints: {
      health: "/health",
      docs: "/docs",
      auth: "/api/auth",
      users: "/api/users",
    },
  });
});

// 4. Health Check
const startTime = Date.now();
app.get("/health", (c) => {
  return c.json({
    status: "UP",
    runtime: "cloudflare-workers",
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || "production",
  });
});

// 4. Mount Documentation (/docs)
app.route("/docs", docsRoutes);

// 5. Mount API Routes
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);

// 6. 404 Handler
app.notFound((c) => {
  return c.json(
    {
      error: `Route not found: ${c.req.method} ${c.req.path}`,
    },
    404
  );
});

// 7. Global Error Handler
app.onError((err, c) => {
  console.error("Server Error:", err);
  return c.json(
    {
      error: err.message || "Internal Server Error",
    },
    500
  );
});

export default app;
