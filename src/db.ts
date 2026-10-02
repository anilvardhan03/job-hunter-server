import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Use ws in Node.js; in Edge runtime, global WebSocket is used
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

let cachedPrisma: PrismaClient | null = null;
let currentDbUrl: string | null = null;

export function getPrisma(databaseUrl: string): PrismaClient {
  if (cachedPrisma && currentDbUrl === databaseUrl) {
    return cachedPrisma;
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaNeon(pool);
  cachedPrisma = new PrismaClient({ adapter });
  currentDbUrl = databaseUrl;
  return cachedPrisma;
}

export default getPrisma;
