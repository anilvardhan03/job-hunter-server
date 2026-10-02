import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const INFISICAL_BASE_URL = "https://app.infisical.com";

interface SecretItem {
  secretKey: string;
  secretValue: string;
  type: "shared";
}

// Strict environment file mapping:
// - dev: accepts either .env.dev or .env
// - prod: ONLY accepts .env.prod (prevents accidental push of dev secrets into prod)
const ENV_FILE_CANDIDATES: Record<string, string[]> = {
  dev: [".env.dev", ".env"],
  prod: [".env.prod"],
};

function resolveEnvFile(envName: string): { filePath: string; fileName: string } | null {
  const candidates = ENV_FILE_CANDIDATES[envName] || [`.env.${envName}`];
  for (const filename of candidates) {
    const fullPath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(fullPath)) {
      return { filePath: fullPath, fileName: filename };
    }
  }
  return null;
}

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf-8");
  return dotenv.parse(raw);
}

// Fetch existing secret keys from Infisical environment to enable true upsert
async function getExistingSecretKeys(
  accessToken: string,
  projectId: string,
  environment: string
): Promise<Set<string>> {
  try {
    const res = await fetch(
      `${INFISICAL_BASE_URL}/api/v3/secrets/raw?workspaceId=${projectId}&environment=${environment}&secretPath=/`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) return new Set();
    const data = (await res.json()) as any;
    const secrets = data.secrets || [];
    return new Set(secrets.map((s: any) => s.secretKey));
  } catch {
    return new Set();
  }
}

async function syncSecrets() {
  console.log("==================================================");
  console.log("Infisical Secrets Synchronization");
  console.log("==================================================");

  // 1. Resolve Infisical credentials from any available env file (.env, .env.dev, .env.prod)
  const baseEnv = loadEnvFile(path.resolve(process.cwd(), ".env"));
  const devEnv = loadEnvFile(path.resolve(process.cwd(), ".env.dev"));
  const prodEnv = loadEnvFile(path.resolve(process.cwd(), ".env.prod"));

  const projectId =
    process.env.INFISICAL_PROJECT_ID ||
    baseEnv.INFISICAL_PROJECT_ID ||
    devEnv.INFISICAL_PROJECT_ID ||
    prodEnv.INFISICAL_PROJECT_ID;

  const clientId =
    process.env.INFISICAL_CLIENT_ID ||
    baseEnv.INFISICAL_CLIENT_ID ||
    devEnv.INFISICAL_CLIENT_ID ||
    prodEnv.INFISICAL_CLIENT_ID;

  const clientSecret =
    process.env.INFISICAL_CLIENT_SECRET ||
    baseEnv.INFISICAL_CLIENT_SECRET ||
    devEnv.INFISICAL_CLIENT_SECRET ||
    prodEnv.INFISICAL_CLIENT_SECRET;

  if (!projectId || !clientId || !clientSecret) {
    console.error("Error: Missing INFISICAL_PROJECT_ID, INFISICAL_CLIENT_ID, or INFISICAL_CLIENT_SECRET in .env / .env.dev / .env.prod");
    process.exit(1);
  }

  // 2. Authenticate with Infisical Universal Auth
  console.log("Authenticating with Infisical Cloud...");
  let accessToken = "";
  try {
    const authRes = await fetch(`${INFISICAL_BASE_URL}/api/v1/auth/universal-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    const authData = (await authRes.json()) as any;

    if (!authRes.ok || !authData.accessToken) {
      console.error("Infisical Authentication Failed:", JSON.stringify(authData, null, 2));
      process.exit(1);
    }

    accessToken = authData.accessToken;
    console.log("Authenticated successfully with Universal Auth!");
  } catch (err: any) {
    console.error("Network error connecting to Infisical:", err.message);
    process.exit(1);
  }

  // 3. Determine target environments (CLI argument: dev, prod, or automatic detection)
  const cliArg = process.argv[2]?.toLowerCase().replace(/^--/, "");
  let targetEnvs: string[];

  if (cliArg) {
    targetEnvs = [cliArg];
  } else {
    // Automatic detection: only sync environments whose files actually exist!
    const hasDevFile = fs.existsSync(path.resolve(process.cwd(), ".env.dev")) || fs.existsSync(path.resolve(process.cwd(), ".env"));
    const hasProdFile = fs.existsSync(path.resolve(process.cwd(), ".env.prod"));

    targetEnvs = [];
    if (hasDevFile) targetEnvs.push("dev");
    if (hasProdFile) {
      targetEnvs.push("prod");
    } else {
      console.log(`No .env.prod found. Skipping 'prod' sync to protect production.`);
    }
  }

  for (const envName of targetEnvs) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Processing environment: "${envName}"`);

    const resolved = resolveEnvFile(envName);
    if (!resolved) {
      console.warn(`No environment file found for "${envName}". (Prod requires .env.prod, Dev requires .env.dev or .env). Skipping.`);
      continue;
    }

    console.log(`Using file: ${resolved.fileName}`);
    const envVars = loadEnvFile(resolved.filePath);

    // Filter out internal Infisical variables and local-only environment markers
    const LOCAL_ONLY_KEYS = new Set(["ENVIRONMENT", "ENV"]);

    const secretsToUpload: SecretItem[] = Object.entries(envVars)
      .filter(
        ([key]) =>
          !key.startsWith("INFISICAL_") &&
          !LOCAL_ONLY_KEYS.has(key.toUpperCase())
      )
      .map(([secretKey, secretValue]) => ({
        secretKey,
        secretValue,
        type: "shared",
      }));

    if (secretsToUpload.length === 0) {
      console.warn(`No secrets found in ${resolved.fileName} to push.`);
      continue;
    }

    console.log(`Found ${secretsToUpload.length} secrets in ${resolved.fileName} (excluded local-only keys: ${Array.from(LOCAL_ONLY_KEYS).join(", ")}). Pushing to Infisical [${envName}]...`);

    // Fetch already existing secrets in this Infisical environment
    const existingKeys = await getExistingSecretKeys(accessToken, projectId, envName);

    // If local-only keys (like ENVIRONMENT) were previously pushed, delete them from Infisical
    for (const localKey of LOCAL_ONLY_KEYS) {
      if (existingKeys.has(localKey)) {
        try {
          await fetch(
            `${INFISICAL_BASE_URL}/api/v3/secrets/raw/${localKey}?workspaceId=${projectId}&environment=${envName}&secretPath=/`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          console.log(`Removed local-only '${localKey}' from Infisical [${envName}].`);
          existingKeys.delete(localKey);
        } catch {
          // continue
        }
      }
    }

    const toCreate = secretsToUpload.filter((s) => !existingKeys.has(s.secretKey));
    const toUpdate = secretsToUpload.filter((s) => existingKeys.has(s.secretKey));

    let createdCount = 0;
    let updatedCount = 0;

    // Create new secrets (POST)
    if (toCreate.length > 0) {
      const createRes = await fetch(`${INFISICAL_BASE_URL}/api/v3/secrets/batch/raw`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: projectId,
          environment: envName,
          secretPath: "/",
          secrets: toCreate,
        }),
      });

      if (!createRes.ok) {
        const createErr = await createRes.json();
        console.error(`Error creating new secrets in [${envName}]:`, JSON.stringify(createErr, null, 2));
      } else {
        createdCount = toCreate.length;
        console.log(`Created ${createdCount} new secret(s) in Infisical [${envName}]`);
      }
    }

    // Update existing secrets (PATCH)
    if (toUpdate.length > 0) {
      const updateRes = await fetch(`${INFISICAL_BASE_URL}/api/v3/secrets/batch/raw`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: projectId,
          environment: envName,
          secretPath: "/",
          secrets: toUpdate,
        }),
      });

      if (!updateRes.ok) {
        const updateErr = await updateRes.json();
        console.error(`Error updating existing secrets in [${envName}]:`, JSON.stringify(updateErr, null, 2));
      } else {
        updatedCount = toUpdate.length;
        console.log(`Updated ${updatedCount} existing secret(s) in Infisical [${envName}]`);
      }
    }

    console.log(`Synced ${createdCount + updatedCount}/${secretsToUpload.length} secrets to Infisical [${envName}]!`);
  }

  console.log("\n==================================================");
  console.log("All done! Check your Infisical Dashboard to verify your secrets.");
  console.log("==================================================");
}

syncSecrets();
