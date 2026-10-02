# 🚀 Job Hunter Server

> A clean, production-ready REST API backend for the Job Hunter platform built with **Node.js, Express, TypeScript, Prisma ORM, and Neon PostgreSQL**.

---

## 📋 Table of Contents
- [Project Overview](#-project-overview)
- [Directory Structure](#-directory-structure)
- [Key Features](#-key-features)
- [Tech Stack & Dependencies](#-tech-stack--dependencies)
- [Environment Setup & Security](#-environment-setup--security)
- [Database & Migrations](#-database--migrations)
- [Interactive API Documentation (ReDoc)](#-interactive-api-documentation-redoc)
- [Automated Postman Cloud Sync](#-automated-postman-cloud-sync)
- [API Reference](#-api-reference)
- [Available Scripts](#-available-scripts)

---

## 🎯 Project Overview

Job Hunter Server serves as the backend API for the Job Hunter tracking platform. It includes:
- Role-Based Access Control (**`SUPERADMIN`** and **`USER`** roles).
- Stateless **JWT authentication** with bcrypt password hashing.
- **Neon PostgreSQL** database management with versioned SQL migrations.
- Single-source-of-truth **ReDoc API Documentation** at `/docs`.
- Real-time **Postman Cloud sync** directly from `apiDocumentation/redoc.yaml`.

---

## 📁 Directory Structure

```
job-hunter-server/
├── apiDocumentation/
│   ├── redoc.yaml             # Single Source of Truth (API specification for ReDoc & Postman)
│   └── sync.ts                # Cloud synchronization engine for Postman API
├── prisma/
│   ├── migrations/
│   │   └── 20261002000000_init_user_management/
│   │       └── migration.sql  # Versioned SQL migration diff
│   └── schema.prisma          # Prisma schema definition
├── src/
│   ├── config.ts              # Centralized environment configuration
│   ├── db.ts                  # Prisma Client singleton
│   ├── middleware/
│   │   └── auth.ts            # JWT authentication & SUPERADMIN authorization guards
│   ├── routes/
│   │   ├── auth.routes.ts     # Register, Login, Profile (/me)
│   │   ├── docs.routes.ts     # ReDoc UI route (/docs)
│   │   └── user.routes.ts     # Admin user management (Role updates, Deletion)
│   ├── scripts/
│   │   └── syncSecrets.ts     # Infisical Cloud secret synchronization engine
│   ├── utils/
│   │   └── auth.ts            # Bcrypt hashing & JWT sign/verify utilities
│   └── server.ts              # Express application bootstrap & route mounting
├── .env                       # Local secrets (strictly git-ignored)
├── .env.example               # Safe environment template for public repo
├── .gitignore                 # Secret shielding & build ignore rules
├── package.json               # Scripts & dependencies
├── tsconfig.json              # TypeScript compiler configuration
└── README.md                  # Project documentation
```

---

## ✨ Key Features

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

## 🛠 Tech Stack & Dependencies

| Category | Technology | Purpose |
|:---|:---|:---|
| **Runtime & Language** | Node.js (v20+), TypeScript (v5.4+) | Type-safe backend application |
| **Framework** | Express.js | Lightweight HTTP routing |
| **Database & ORM** | Neon PostgreSQL, Prisma ORM (v5.20) | Relational cloud database and schema migrations |
| **Authentication** | `jsonwebtoken`, `bcryptjs` | JWT token issuance and secure password hashing |
| **Development** | `tsx` | Instant TS execution and auto-reload watcher |
| **Documentation** | OpenAPI 3.0.3, ReDoc UI | Standardized API reference |
| **Spec Parser** | `yaml` | Parses OpenAPI YAML specification |

---

## 🔒 Environment Setup & Security

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

# Infisical Cloud Secrets Manager (Universal Auth)
INFISICAL_PROJECT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
INFISICAL_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
INFISICAL_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

> **Security Note**: All environment files (`.env`, `.env.*`, `*.local`) are blocked in `.gitignore`. No credentials exist in the source code.

---

## 🗄 Database & Migrations

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

## 📖 Interactive API Documentation (ReDoc)

Open your browser when the server is running:

👉 **[http://localhost:3000/docs](http://localhost:3000/docs)** — Interactive ReDoc Documentation  
👉 **[http://localhost:3000/docs/spec.yaml](http://localhost:3000/docs/spec.yaml)** — Raw YAML Specification  

Whenever you update `apiDocumentation/redoc.yaml`, simply refresh your browser to view the changes.

---

## 📬 Automated Postman Cloud Sync

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

## 🔐 Automated Infisical Secrets Sync

To push local environment variables securely to Infisical Cloud without exposing secrets in GitHub:

```bash
# Push development secrets (.env.dev or .env) to Infisical 'dev'
npm run secrets:push:dev

# Push production secrets (.env.prod or .env) to Infisical 'prod'
npm run secrets:push:prod

# Sync both environments in one command
npm run secrets:push
```

### Environment File Mapping:
- **`dev` Environment**: Reads [`.env.dev`](file:///e:/Projects/job-hunter-server/.env.dev) (falls back to `.env` if `.env.dev` is not found). Sets `NODE_ENV="development"`.
- **`prod` Environment**: Reads [`.env.prod`](file:///e:/Projects/job-hunter-server/.env.prod) (falls back to `.env` if `.env.prod` is not found). Sets `NODE_ENV="production"`.

### How the Secrets Sync Engine Works (`src/scripts/syncSecrets.ts`):
1. **Resolves Environment Files**: Automatically picks `.env.dev` for development and `.env.prod` for production.
2. **Universal Auth**: Authenticates against Infisical Cloud (`https://app.infisical.com`) via Machine Identity Client ID & Client Secret to obtain an ephemeral access token.
3. **Batch Raw API**: Calls `/api/v3/secrets/batch/raw` with target workspace ID and environment.
4. **Auto-Upsert (POST & PATCH)**: Attempts creation (`POST`) and automatically falls back to update (`PATCH`) if the secrets already exist.
5. **Render Production Sync**: In your Infisical project dashboard, go to **Integrations** $\rightarrow$ **Render** to deploy all synced secrets directly to your Render Web Service with one click.

## 📜 Available Scripts

```bash
npm run dev               # Start server with live reload (tsx watch)
npm run build             # Compile TypeScript to dist/ (tsc)
npm start                 # Start compiled server with tsx
npm run postman:sync      # Push apiDocumentation/redoc.yaml to Postman Cloud
npm run secrets:push      # Push secrets to both Infisical 'dev' and 'prod'
npm run secrets:push:dev  # Push .env.dev to Infisical 'dev'
npm run secrets:push:prod # Push .env.prod to Infisical 'prod'
npm run prisma:status     # Check migration status
npm run prisma:diff       # Generate SQL migration diff from schema.prisma
```
