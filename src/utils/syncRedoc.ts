import fs from "fs";
import path from "path";

/**
 * Automatically syncs the port number from .env (config.port) into apiDocumentation/redoc.yaml
 */
export function syncRedocPort(port: number) {
  try {
    const redocPath = path.resolve(__dirname, "../../apiDocumentation/redoc.yaml");
    if (!fs.existsSync(redocPath)) return;

    const content = fs.readFileSync(redocPath, "utf-8");
    const updated = content
      .replace(
        /(port:\s*\n\s*default:\s*")\d+(")/g,
        `$1${port}$2`
      )
      .replace(
        /(- url:\s*http:\/\/localhost:)\d+/g,
        `$1${port}`
      );

    if (updated !== content) {
      fs.writeFileSync(redocPath, updated, "utf-8");
      console.log(`[Docs] Updated apiDocumentation/redoc.yaml port to :${port}`);
    }
  } catch {
    // Graceful fallback if filesystem is read-only
  }
}
