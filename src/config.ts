import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Accept either .env or .env.dev for local development
const candidateFiles = [
  process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : null,
  ".env.dev",
  ".env",
].filter(Boolean) as string[];

for (const file of candidateFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
    break;
  }
}

const jwtSecret = (process.env.JWT_SECRET || "").trim();
if (!jwtSecret && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL: JWT_SECRET environment variable is missing!");
}

export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || "",
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  rapidApiKeys: (process.env.RAPIDAPI_KEYS || process.env.RAPIDAPI_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
  rapidApiKey: (process.env.RAPIDAPI_KEYS || process.env.RAPIDAPI_KEY || "")
    .split(",")[0]
    ?.trim() || "",

  brevo: {
    apiKey: (process.env.BREVO_API_KEY || "").trim(),
    senderEmail: (process.env.BREVO_SENDER_EMAIL || "").split(",")[0].trim(),
    senderName: process.env.BREVO_SENDER_NAME || "",
    recipients: (process.env.NOTIFY_EMAIL || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  },

  postman: {
    apiKey: (process.env.POSTMAN_API_KEY || "").trim(),
    collectionUid: (process.env.POSTMAN_COLLECTION_UID || "").trim(),
  },
};
