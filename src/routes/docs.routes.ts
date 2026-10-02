import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import YAML from "yaml";

const router = Router();
const REDOC_YAML_PATH = path.resolve(__dirname, "../../apiDocumentation/redoc.yaml");
const REDOC_HTML_TEMPLATE = path.resolve(__dirname, "../../apiDocumentation/index.html");

// Only route: GET /docs (loads index.html template and injects parsed redoc.yaml)
router.get("/", (_req: Request, res: Response): void => {
  if (!fs.existsSync(REDOC_YAML_PATH) || !fs.existsSync(REDOC_HTML_TEMPLATE)) {
    res.status(404).send("API Documentation template or specification not found");
    return;
  }

  const rawYaml = fs.readFileSync(REDOC_YAML_PATH, "utf-8");
  const spec = YAML.parse(rawYaml);
  const template = fs.readFileSync(REDOC_HTML_TEMPLATE, "utf-8");

  const html = template
    .replace("<title>Job Hunter API Documentation</title>", `<title>${spec.info?.title || "Job Hunter API Documentation"}</title>`)
    .replace(
      '<script id="spec-data" type="application/json">{}</script>',
      `<script id="spec-data" type="application/json">${JSON.stringify(spec)}</script>`
    );

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
