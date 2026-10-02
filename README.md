# Job Hunter Server

> A clean, production-ready REST API backend for the Job Hunter platform built with **Node.js, Express, TypeScript, Prisma ORM, and Neon PostgreSQL**.

---

## Table of Contents
- [Project Overview](#-project-overview)
- [Directory Structure](#-directory-structure)
- [Key Features](#-key-features)
- [Tech Stack & Dependencies](#-tech-stack--dependencies)
- [Environment Setup & Security](#-environment-setup--security)
- [Database & Migrations](#-database--migrations)
- [Interactive API Documentation (ReDoc)](#-interactive-api-documentation-redoc)
- [Automated Postman Cloud Sync](#-automated-postman-cloud-sync)
- [API Reference](#-api-reference)
- [Cloudflare Secrets Management](#-cloudflare-secrets-management)
- [Available Scripts](#-available-scripts)

---

## Project Overview

Job Hunter Server serves as the backend API for the Job Hunter tracking platform. It includes:
- Role-Based Access Control (**`SUPERADMIN`** and **`USER`** roles).
- Stateless **JWT authentication** with bcrypt password hashing.
- **Neon PostgreSQL** database management with versioned SQL migrations.
- Single-source-of-truth **ReDoc API Documentation** at `/docs`.
- Real-time **Postman Cloud sync** directly from `apiDocumentation/redoc.yaml`.

---

## Directory Structure

```
job-hunter-server/
├── apiDocumentation/
│   ├── redoc.yaml             # Single Source of Truth (API specification for ReDoc & Postman)
│   └── sync.ts                # Cloud synchronization engine for Postman API
├── prisma/
│   ├── migrations/
│   │   └── 20261002000000_init_user_management/
│   │       └── migration.sql  # Versioned SQL migration diff
│   └── schema.prisma          # Prisma schema with driverAdapters preview
├── src/
│   ├── config.ts              # Centralized environment configuration
│   ├── db.ts                  # Neon Serverless Prisma Client adapter
│   ├── index.ts               # Cloudflare Workers root entry point (Hono)
│   ├── middleware/
│   │   └── auth.ts            # JWT authentication & SUPERADMIN authorization guards
│   ├── routes/
│   │   ├── auth.routes.ts     # Register, Login, Profile (/me)
│   │   ├── docs.routes.ts     # Edge ReDoc UI route (/docs)
│   │   └── user.routes.ts     # Admin user management (Role updates, Deletion)
│   ├── utils/
│   │   └── auth.ts            # Bcrypt hashing & JWT sign/verify utilities
│   └── server.ts              # Local Node.js server (@hono/node-server)
├── .dev.vars                  # Wrangler edge secrets (git-ignored)
├── .env                       # Local secrets (strictly git-ignored)
├── .env.example               # Safe environment template for public repo
├── .gitignore                 # Secret shielding & build ignore rules
├── package.json               # Scripts & dependencies
├── tsconfig.json              # TypeScript compiler configuration
├── wrangler.toml              # Cloudflare Workers configuration
└── README.md                  # Project documentation
```

---

## Key Features

### 1. Role-Based User Management
- **Two Roles Only**: `SUPERADMIN` and `USER`.
- **First-User Bootstrap**: The very first user to register in an empty database is **automatically granted `SUPERADMIN`** status.
- **Protection Logic**: Superadmins cannot delete their own account or demote themselves if they are the sole remaining superadmin.

### 2. High-Performance Development
- Powered by **`tsx watch`** for sub-second, zero-config TypeScript compilation and live reload upon file save.

### 3. Unified API Documentation
- Edit endpoints once in **`apiDocumentation/openapi.yaml`**.
- Instantly reflected in the **ReDoc documentation at `/docs`**.
- Transformed and pushed to **Postman Cloud** with `npm run postman:sync`.

---

## Tech Stack & Dependencies

| Category | Technology | Purpose |
|:---|:---|:---|
| **Runtime & Edge** | Cloudflare Workers (V8 Isolates), Node.js (v20+) | Edge compute runtime with sub-50ms latency |
| **Framework** | Hono | Ultra-fast, edge-optimized routing framework |
| **Database & ORM** | Neon PostgreSQL, Prisma ORM (v5.20) | Serverless PostgreSQL with `@prisma/adapter-neon` |
| **Connection Pooling** | `@neondatabase/serverless` | WebSocket connection pooler for edge isolates |
| **Authentication** | `jsonwebtoken`, `bcryptjs` | JWT token issuance and secure password hashing |
| **CLI & Deployment** | `wrangler` | Cloudflare Workers CLI for emulation and deployment |
| **Documentation** | OpenAPI 3.0.3, ReDoc UI | Standardized API reference rendered at `/docs` |
| **Spec Parser** | `yaml` | Parses OpenAPI YAML specification |

---

## Environment Setup & Security

### 1. Create `.env`
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Required Variables
```env
PORT=3000

# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# JWT configuration (Generate with node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET="your-secure-256-bit-jwt-secret-here"
JWT_EXPIRES_IN="7d"

# Postman Cloud synchronization
POSTMAN_API_KEY="PMAK-xxxxxxxxxxxxxxxxxxxxxxxx"
POSTMAN_COLLECTION_UID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

> **Security Note**: All environment files (`.env`, `.env.*`, `*.local`) are blocked in `.gitignore`. No credentials exist in the source code.

---

## Database & Migrations

The database uses **versioned SQL migration files** instead of direct un-tracked pushes.

```bash
# Check status of migrations against database
npm run prisma:status

# Generate a new SQL migration diff if schema.prisma changes
npm run prisma:diff

# Re-generate Prisma Client types
npm run prisma:generate
```

---

## Interactive API Documentation (ReDoc)

Open your browser when the server is running:

**[http://localhost:3000/docs](http://localhost:3000/docs)** — Interactive ReDoc Documentation  
**[http://localhost:3000/docs/spec.yaml](http://localhost:3000/docs/spec.yaml)** — Raw YAML Specification  

Whenever you update `apiDocumentation/redoc.yaml`, simply refresh your browser to view the changes.

---

## Automated Postman Cloud Sync

To push the latest specification to your Postman Cloud workspace:

```bash
npm run postman:sync
```

### What the Sync Engine Does:
1. Reads `apiDocumentation/redoc.yaml`.
2. Translates OpenAPI path parameters (`{id}`) to Postman parameters (`:id`).
3. Sets up collection-level variables (`baseUrl`, `token`).
4. Attaches Bearer authentication to protected endpoints.
5. Injects automated test scripts on `/login` and `/register` to store the returned JWT into `{{token}}`.
6. Sends an HTTP `PUT` to update your existing Postman collection in-place without creating duplicate collections.

---

## Cloudflare Secrets Management

For local development and Cloudflare production deployments:

### 1. Local Development
- Secrets are stored in `.dev.vars` (or `.env` for Node.js mode).
- Both files are strictly ignored by Git (`.gitignore`).
- When running `npm run dev:edge`, Wrangler automatically loads `.dev.vars` into `c.env`.

### 2. Production Deployment (Cloudflare Dashboard / CLI)

#### Option 1: Via Cloudflare Web Dashboard (Method C)
1. Open the **[Cloudflare Dashboard](https://dash.cloudflare.com/)**.
2. Navigate to **Workers & Pages** $\rightarrow$ select **`job-hunter-server`**.
3. Go to **Settings** $\rightarrow$ **Variables and Secrets**.
4. Click **Add** under *Variables and Secrets* for each key (`DATABASE_URL`, `JWT_SECRET`, `BREVO_API_KEY`, etc.).
5. Check **Encrypt** for sensitive secrets to protect them.

#### Option 2: Via Wrangler CLI
```bash
# Add secrets interactively
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put BREVO_API_KEY
```

---

## Available Scripts

```bash
npm run dev               # Start local server on Node.js (tsx watch)
npm run dev:edge          # Start local Cloudflare Workers edge runtime (wrangler dev)
npm run deploy            # Deploy worker directly to Cloudflare (wrangler deploy)
npm run build             # Compile TypeScript to dist/ (tsc)
npm run postman:sync      # Push apiDocumentation/redoc.yaml to Postman Cloud
npm run prisma:status     # Check migration status
npm run prisma:diff       # Generate SQL migration diff from schema.prisma
```
