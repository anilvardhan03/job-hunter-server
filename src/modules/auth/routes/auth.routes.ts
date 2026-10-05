import { Hono } from "hono";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../../../middleware/auth";
import { authRateLimiter, loginIpRateLimiter } from "../../../middleware/rateLimiter";
import { AppEnv } from "../../../types";

const authRoutes = new Hono<AppEnv>();

// 1. Register a new user (Rate-limited, requires email verification)
authRoutes.post("/register", authRateLimiter, authController.register);

// 2. Verify email via link
authRoutes.get("/verify-email", authController.verifyEmail);

// 3. Resend verification email (Rate-limited)
authRoutes.post("/resend-verification", authRateLimiter, authController.resendVerification);

// 4. Login (IP rate-limited with 3-attempt 5-minute lockout)
authRoutes.post("/login", loginIpRateLimiter, authController.login);

// 5. Get current user profile
authRoutes.get("/me", authenticate, authController.getProfile);
authRoutes.get("/profile", authenticate, authController.getProfile);

// 6. Update current user profile
authRoutes.put("/profile", authenticate, authController.updateProfile);
authRoutes.patch("/profile", authenticate, authController.updateProfile);
authRoutes.put("/me", authenticate, authController.updateProfile);
authRoutes.patch("/me", authenticate, authController.updateProfile);

// 7. Request profile deletion (scheduled for permanent removal after 1 week)
authRoutes.delete("/profile", authenticate, authController.deleteProfile);
authRoutes.delete("/me", authenticate, authController.deleteProfile);

export default authRoutes;
