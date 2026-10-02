import express, { Request, Response } from "express";
import cors from "cors";
import { config } from "./config";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import docsRoutes from "./routes/docs.routes";

const app = express();
const startTime = Date.now();

app.use(cors());
app.use(express.json());

// 1. Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "UP",
    uptimeSeconds: Math.round((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    port: config.port,
  });
});

// 2. Interactive ReDoc Documentation (/docs)
app.use("/docs", docsRoutes);

// 3. Authentication & User Management Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Start Express Server
const server = app.listen(config.port, () => {
  console.log(`Server running on port :${config.port}`);
  console.log(`Health:    http://localhost:${config.port}/health`);
  console.log(`Docs:      http://localhost:${config.port}/docs`);
  console.log(`Postman:   Run 'npm run postman:sync' to update collection`);
  console.log(`Infisical: Run 'npm run secrets:push' to sync secrets`);
});

export default server;
