import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { getPrisma } from "./db";
import { config } from "./config";
import { AppEnv } from "./types";
import { authRoutes } from "./modules/auth";
import { userRoutes } from "./modules/user";
import docsRoutes from "./routes/docs.routes";
import { errorResponse } from "./utils/response";
import {
  ERROR_CODES,
  SERVER_ERROR_MESSAGES,
  SECURITY_ERROR_MESSAGES,
} from "./constants";
import { createSecureCors, securitySanitizer } from "./middleware/security";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { botAndProbeBlocker } from "./middleware/botBlocker";

const app = new Hono<AppEnv>();

// 0. Cybersecurity Firewall: Bot Probe Interceptor & Malicious IP Blacklist
app.use("*", botAndProbeBlocker);

// 1. Cybersecurity: HTTP Security Headers (XSS, Clickjacking, MIME-sniffing)
app.use(
  "*",
  secureHeaders({
    xContentTypeOptions: "nosniff",
    xFrameOptions: "DENY",
    xXssProtection: "1; mode=block",
    referrerPolicy: "strict-origin-when-cross-origin",
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.redoc.ly"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.redoc.ly",
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  })
);

// 2. Cybersecurity: Secure CORS Policy
app.use("*", createSecureCors(config.cors.allowedOrigins));

// 3. Cybersecurity: Request Payload Size Limit (100KB DoS protection)
app.use(
  "*",
  bodyLimit({
    maxSize: 100 * 1024,
    onError: (c) =>
      errorResponse(
        c,
        ERROR_CODES.BAD_REQUEST,
        SECURITY_ERROR_MESSAGES.PAYLOAD_TOO_LARGE
      ),
  })
);

// 4. Cybersecurity: XSS Sanitization, Prototype Pollution, & SQLi Pattern Detection
app.use("*", securitySanitizer);

// 5. Cybersecurity: General API Rate Limiting (120 reqs/min per IP)
app.use("/api/*", apiRateLimiter);

// 6. Clean Request Logger
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`[${new Date().toLocaleTimeString()}] ${c.req.method} ${c.req.path} ${c.res.status} (${ms}ms)`);
});

// 7. Local Node.js / process.env fallback (populates c.env if running outside Cloudflare)
app.use("*", async (c, next) => {
  if (!c.env?.DATABASE_URL && typeof process !== "undefined" && process.env?.DATABASE_URL) {
    const existing = c.env || {};
    (c as any).env = {
      ...existing,
      DATABASE_URL: existing.DATABASE_URL || process.env.DATABASE_URL,
      JWT_SECRET: existing.JWT_SECRET || process.env.JWT_SECRET,
      JWT_EXPIRES_IN: existing.JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "7d",
      ENVIRONMENT: existing.ENVIRONMENT || process.env.ENVIRONMENT || "development",
      RAPIDAPI_KEYS: existing.RAPIDAPI_KEYS || process.env.RAPIDAPI_KEYS,
      RAPIDAPI_KEY: existing.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY,
      BREVO_API_KEY: existing.BREVO_API_KEY || process.env.BREVO_API_KEY,
      BREVO_SENDER_EMAIL: existing.BREVO_SENDER_EMAIL || process.env.BREVO_SENDER_EMAIL,
      BREVO_SENDER_NAME: existing.BREVO_SENDER_NAME || process.env.BREVO_SENDER_NAME,
      NOTIFY_EMAIL: existing.NOTIFY_EMAIL || process.env.NOTIFY_EMAIL,
      POSTMAN_API_KEY: existing.POSTMAN_API_KEY || process.env.POSTMAN_API_KEY,
      POSTMAN_COLLECTION_UID: existing.POSTMAN_COLLECTION_UID || process.env.POSTMAN_COLLECTION_UID,
    };
  }
  await next();
});

// 8. Attach PrismaClient with Neon Serverless adapter to every request
app.use("*", async (c, next) => {
  const dbUrl = c.env?.DATABASE_URL;
  if (!dbUrl) {
    console.error(`[${c.req.method} ${c.req.path}] DATABASE_URL binding is missing in environment!`);
    return errorResponse(
      c,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      SERVER_ERROR_MESSAGES.DATABASE_URL_REQUIRED
    );
  }
  c.set("prisma", getPrisma(dbUrl));
  await next();
});

// 9. Root Endpoint
app.get("/", (c) => {
  return c.json({
    message: "Job Hunter Server is working!",
    status: "online",
  });
});

// 10. Health Check
app.get("/health", (c) => {
  return c.json({
    message: "Job Hunter Server is working!",
    status: "online",
    timestamp: new Date().toISOString(),
  });
});

// 11. Mount Documentation (/docs)
app.route("/docs", docsRoutes);

// 12. Mount API Routes
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);

// 13. 404 Handler
app.notFound((c) => {
  return errorResponse(
    c,
    ERROR_CODES.NOT_FOUND,
    SERVER_ERROR_MESSAGES.ROUTE_NOT_FOUND(c.req.method, c.req.path)
  );
});

// 14. Global Error Handler
app.onError((err, c) => {
  console.error("Server Error:", err);
  return errorResponse(
    c,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    err.message || SERVER_ERROR_MESSAGES.INTERNAL_SERVER_ERROR
  );
});

export default app;
