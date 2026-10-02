import { serve } from "@hono/node-server";
import app from "./index";
import { config } from "./config";

// In local Node.js environment, supply process.env as Hono bindings fallback
app.use("*", async (c, next) => {
  if (!c.env || !c.env.DATABASE_URL) {
    const existing = c.env || {};
    (c as any).env = {
      ...existing,
      DATABASE_URL: existing.DATABASE_URL || config.databaseUrl,
      JWT_SECRET: existing.JWT_SECRET || config.jwt.secret,
      JWT_EXPIRES_IN: existing.JWT_EXPIRES_IN || config.jwt.expiresIn,
      ENVIRONMENT: existing.ENVIRONMENT || process.env.ENVIRONMENT || "development",
      RAPIDAPI_KEYS: existing.RAPIDAPI_KEYS || config.rapidApiKeys.join(","),
      RAPIDAPI_KEY: existing.RAPIDAPI_KEY || config.rapidApiKey,
      BREVO_API_KEY: existing.BREVO_API_KEY || config.brevo.apiKey,
      BREVO_SENDER_EMAIL: existing.BREVO_SENDER_EMAIL || config.brevo.senderEmail,
      BREVO_SENDER_NAME: existing.BREVO_SENDER_NAME || config.brevo.senderName,
      NOTIFY_EMAIL: existing.NOTIFY_EMAIL || config.brevo.recipients.join(","),
      POSTMAN_API_KEY: existing.POSTMAN_API_KEY || config.postman.apiKey,
      POSTMAN_COLLECTION_UID: existing.POSTMAN_COLLECTION_UID || config.postman.collectionUid,
    };
  }
  await next();
});

const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`Server running on port :${info.port} (Hono + Cloudflare Workers Native)`);
    console.log(`Health:    http://localhost:${info.port}/health`);
    console.log(`Docs:      http://localhost:${info.port}/docs`);
    console.log(`Postman:   Run 'npm run postman:sync' to update collection`);
  }
);

export default server;
