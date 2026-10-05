import { Hono } from "hono";
import { AppEnv } from "../types";
import YAML from "yaml";

const docs = new Hono<AppEnv>();

export const openApiSpecYaml = `openapi: 3.0.3
info:
  title: Job Hunter Backend API
  description: Backend API for Job Hunter tracking and management platform covering Server Health, Authentication, and User Management.
  version: 1.0.0
  contact:
    name: Job Hunter Team


tags:
  - name: Server Health
    description: Server status and health check
  - name: Authentication
    description: User registration, login, and profile management
  - name: User Management
    description: Superadmin user administration and role management

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: 'JWT Authorization header using Bearer scheme. Example: "Authorization: Bearer {token}"'
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          example: cm20xyz123
        email:
          type: string
          format: email
          example: user@example.com
        name:
          type: string
          nullable: true
          example: John Doe
        role:
          type: string
          enum: [SUPERADMIN, USER]
          example: USER
        isVerified:
          type: boolean
          example: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    RegisterInput:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
          example: admin@jobhunter.local
        password:
          type: string
          minLength: 6
          example: Password123!
        name:
          type: string
          example: Super Admin
    LoginInput:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
          example: admin@jobhunter.local
        password:
          type: string
          example: Password123!
    UpdateRoleInput:
      type: object
      required:
        - role
      properties:
        role:
          type: string
          enum: [SUPERADMIN, USER]
          example: SUPERADMIN
    ApiError:
      type: object
      properties:
        statusCode:
          type: integer
          example: 409
        error:
          type: string
          example: Conflict
        message:
          type: string
          example: User with this email already exists

paths:
  /:
    get:
      tags:
        - Server Health
      summary: Root status check
      description: Confirms the server is working and lists main endpoints
      responses:
        "200":
          description: Server is working
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Job Hunter Server is working!
                  status:
                    type: string
                    example: UP
                  runtime:
                    type: string
                    example: cloudflare-workers

  /health:
    get:
      tags:
        - Server Health
      summary: Check server health
      description: Returns server status (UP), uptime in seconds, and port
      responses:
        "200":
          description: Server is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: UP
                  uptimeSeconds:
                    type: number
                    example: 42
                  timestamp:
                    type: string
                    format: date-time
                  port:
                    type: number
                    example: 3000

  /api/auth/register:
    post:
      tags:
        - Authentication
      summary: Register new user
      description: Registers a new user with USER role and dispatches an email verification link
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RegisterInput"
            example:
              email: user@jobhunter.local
              password: Password123!
              name: Test User
      responses:
        "201":
          description: User registered successfully (verification email sent)
        "400":
          description: Validation error
        "409":
          description: User already exists

  /api/auth/verify-email:
    get:
      tags:
        - Authentication
      summary: Verify email address
      description: Validates email verification token sent to user's inbox and activates account
      parameters:
        - name: token
          in: query
          required: true
          description: Verification token received via email
          schema:
            type: string
      responses:
        "200":
          description: Email verified successfully
        "400":
          description: Invalid or expired verification token

  /api/auth/resend-verification:
    post:
      tags:
        - Authentication
      summary: Resend verification email
      description: Generates a new verification link and dispatches to user email
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
              properties:
                email:
                  type: string
                  format: email
                  example: user@jobhunter.local
      responses:
        "200":
          description: Verification email resent successfully
        "400":
          description: Validation error
        "404":
          description: User not found

  /api/auth/login:
    post:
      tags:
        - Authentication
      summary: Login user
      description: Authenticates user credentials and returns JWT token (requires verified email)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/LoginInput"
            example:
              email: admin@jobhunter.local
              password: Password123!
      responses:
        "200":
          description: Login successful with JWT token
        "401":
          description: Invalid email or password

  /api/auth/me:
    get:
      tags:
        - Authentication
      summary: Get current authenticated user profile
      security:
        - bearerAuth: []
      responses:
        "200":
          description: User profile
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: "#/components/schemas/User"
        "401":
          description: Unauthorized

  /api/users:
    get:
      tags:
        - User Management
      summary: List all users (SUPERADMIN only)
      security:
        - bearerAuth: []
      responses:
        "200":
          description: List of registered users
        "401":
          description: Unauthorized
        "403":
          description: Forbidden - requires SUPERADMIN role

  /api/users/{id}/role:
    patch:
      tags:
        - User Management
      summary: Update user role (SUPERADMIN only)
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          example: target_user_id
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateRoleInput"
            example:
              role: SUPERADMIN
      responses:
        "200":
          description: Role updated successfully
        "400":
          description: Invalid role or cannot demote sole superadmin
        "404":
          description: User not found

  /api/users/{id}:
    delete:
      tags:
        - User Management
      summary: Delete user (SUPERADMIN only)
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          example: target_user_id
      responses:
        "200":
          description: User deleted successfully
        "400":
          description: Cannot delete own account
        "404":
          description: User not found
`;

export const openApiSpecBase = YAML.parse(openApiSpecYaml);

export function getDynamicOpenApiSpec(origin?: string) {
  const currentOrigin = origin || "http://localhost:3000";
  const isLocal = currentOrigin.includes("localhost") || currentOrigin.includes("127.0.0.1");

  const servers = [
    {
      url: currentOrigin,
      description: isLocal
        ? `Current local development server`
        : "Current environment server",
    },
  ];

  if (isLocal) {
    servers.push({
      url: "https://job-hunter-server-dev.jobhunterserver.workers.dev",
      description: "Cloudflare Workers production",
    });
  }

  return {
    ...openApiSpecBase,
    servers,
  };
}

export const openApiSpecJson = getDynamicOpenApiSpec();

function extractOrigin(c: any): string {
  try {
    const url = new URL(c.req.url);
    return url.origin;
  } catch {
    const host = c.req.header("host") || `localhost:${c.env?.PORT || (typeof process !== "undefined" && process.env?.PORT) || 3000}`;
    const proto = c.req.header("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
}

// GET /docs - Interactive ReDoc Documentation
docs.get("/", (c) => {
  const origin = extractOrigin(c);
  const spec = getDynamicOpenApiSpec(origin);

  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Job Hunter API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <div id="redoc-container"></div>
    <script id="spec-data" type="application/json">${JSON.stringify(spec)}</script>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
    <script>
      const specElement = document.getElementById("spec-data");
      const spec = JSON.parse(specElement ? specElement.textContent || "{}" : "{}");
      Redoc.init(spec, {
        scrollYOffset: 0,
        theme: {
          colors: {
            primary: { main: '#6366f1' }
          }
        }
      }, document.getElementById('redoc-container'));
    </script>
  </body>
</html>`;

  return c.html(html);
});

// GET /docs/spec.yaml - Raw OpenAPI YAML
docs.get("/spec.yaml", (c) => {
  const origin = extractOrigin(c);
  const spec = getDynamicOpenApiSpec(origin);
  return c.text(YAML.stringify(spec), 200, {
    "Content-Type": "text/yaml; charset=utf-8",
  });
});

// GET /docs/spec.json - Raw OpenAPI JSON
docs.get("/spec.json", (c) => {
  const origin = extractOrigin(c);
  const spec = getDynamicOpenApiSpec(origin);
  return c.json(spec);
});

export default docs;
