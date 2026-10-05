import { config } from "./config";
import { serve } from "@hono/node-server";
import { syncRedocPort } from "./utils/syncRedoc";
import { getPrisma } from "./db";
import { startAccountPurgeScheduler } from "./utils/cleanupTask";
import app from "./index";

// Keep apiDocumentation/redoc.yaml port in sync with .env
syncRedocPort(config.port);

// Start background task to purge accounts soft-deleted > 1 week ago
if (config.databaseUrl) {
  startAccountPurgeScheduler(getPrisma(config.databaseUrl));
}

const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`\nServer running on port :${info.port}`);
    console.log(`Health: http://localhost:${info.port}/health`);
    console.log(`Docs: http://localhost:${info.port}/docs`);
    console.log(`Postman: Run 'npm run postman:sync' to update collection\n`);
  }
);

export default server;
