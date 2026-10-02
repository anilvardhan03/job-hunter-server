import fs from "fs";
import path from "path";
import YAML from "yaml";
import { config } from "../src/config";

const YAML_FILE_PATH = path.resolve(__dirname, "redoc.yaml");

interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers?: { url: string; description?: string }[];
  tags?: { name: string; description?: string }[];
  paths: Record<string, Record<string, any>>;
  components?: {
    securitySchemes?: Record<string, any>;
    schemas?: Record<string, any>;
  };
}

function convertOpenApiToPostman(spec: OpenApiSpec) {
  const foldersMap: Record<string, any[]> = {};

  if (Array.isArray(spec.tags)) {
    for (const tag of spec.tags) {
      foldersMap[tag.name] = [];
    }
  }

  for (const [routePath, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(methods)) {
      const httpMethod = method.toUpperCase();
      if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(httpMethod)) {
        continue;
      }

      const tagName = operation.tags?.[0] || "General";
      if (!foldersMap[tagName]) {
        foldersMap[tagName] = [];
      }

      // Convert {id} to :id for Postman
      const postmanPath = routePath.replace(/{([a-zA-Z0-9_]+)}/g, ":$1");
      const pathSegments = postmanPath.split("/").filter(Boolean);

      const pathVariables: any[] = [];
      const matches = routePath.match(/{([a-zA-Z0-9_]+)}/g);
      if (matches) {
        matches.forEach((m) => {
          const varName = m.replace(/[{}]/g, "");
          pathVariables.push({
            key: varName,
            value: `:${varName}`,
            description: `${varName} parameter`,
          });
        });
      }

      const headers: any[] = [];
      let requestBody: any = undefined;

      if (operation.requestBody?.content?.["application/json"]) {
        headers.push({ key: "Content-Type", value: "application/json" });
        const jsonContent = operation.requestBody.content["application/json"];
        const sample = jsonContent.example || jsonContent.schema?.example || {};
        requestBody = {
          mode: "raw",
          raw: JSON.stringify(sample, null, 2),
          options: { raw: { language: "json" } },
        };
      }

      let auth: any = undefined;
      if (operation.security && operation.security.some((s: any) => s.bearerAuth)) {
        auth = {
          type: "bearer",
          bearer: [{ key: "token", value: "{{token}}", type: "string" }],
        };
      }

      let event: any[] | undefined = undefined;
      if (
        routePath.includes("/api/auth/login") ||
        routePath.includes("/api/auth/register")
      ) {
        event = [
          {
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "const res = pm.response.json();",
                "if (res.token) {",
                '  pm.collectionVariables.set("token", res.token);',
                "}",
              ],
            },
          },
        ];
      }

      foldersMap[tagName].push({
        name: operation.summary || `${httpMethod} ${routePath}`,
        request: {
          method: httpMethod,
          header: headers,
          body: requestBody,
          url: {
            raw: `{{baseUrl}}${postmanPath}`,
            host: ["{{baseUrl}}"],
            path: pathSegments,
            variable: pathVariables.length > 0 ? pathVariables : undefined,
          },
          auth,
          description: operation.description,
        },
        event,
      });
    }
  }

  const postmanItems = Object.entries(foldersMap).map(([folderName, items]) => ({
    name: folderName,
    item: items,
  }));

  return {
    info: {
      name: spec.info.title,
      description: spec.info.description,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      {
        key: "baseUrl",
        value: `http://localhost:${config.port}`,
        type: "string",
      },
      {
        key: "token",
        value: "",
        type: "string",
      },
    ],
    item: postmanItems,
  };
}

export async function syncPostman(exitOnError = true): Promise<boolean> {
  const { apiKey, collectionUid } = config.postman;

  if (!apiKey || !collectionUid) {
    if (exitOnError) {
      console.error("Error: POSTMAN_API_KEY or POSTMAN_COLLECTION_UID is not set in .env");
      process.exit(1);
    }
    return false;
  }

  if (!fs.existsSync(YAML_FILE_PATH)) {
    console.error(`Error: redoc.yaml not found at ${YAML_FILE_PATH}`);
    if (exitOnError) process.exit(1);
    return false;
  }

  console.log("Reading redoc.yaml and syncing to Postman Cloud...");

  const rawYaml = fs.readFileSync(YAML_FILE_PATH, "utf-8");
  const spec = YAML.parse(rawYaml) as OpenApiSpec;
  const collectionData = convertOpenApiToPostman(spec);
  const payload = { collection: collectionData };

  try {
    const response = await fetch(
      `https://api.getpostman.com/collections/${collectionUid}`,
      {
        method: "PUT",
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = (await response.json()) as any;

    if (!response.ok) {
      console.error("Postman Sync Failed:", JSON.stringify(data, null, 2));
      if (exitOnError) process.exit(1);
      return false;
    }

    console.log("Postman Collection Successfully Synced from apiDocumentation/redoc.yaml!");
    console.log(`Collection: "${data.collection?.name || collectionData.info.name}"`);
    console.log(
      `Folders: ${collectionData.item
        .map((f: any) => `${f.name} (${f.item.length} requests)`)
        .join(" | ")}`
    );
    return true;
  } catch (error: any) {
    console.error("Network error connecting to Postman API:", error.message);
    if (exitOnError) process.exit(1);
    return false;
  }
}

syncPostman(true);
