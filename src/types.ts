import { PrismaClient, Role } from "@prisma/client";

export interface Bindings {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  RAPIDAPI_KEYS?: string;
  RAPIDAPI_KEY?: string;
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
  NOTIFY_EMAIL?: string;
  POSTMAN_API_KEY?: string;
  POSTMAN_COLLECTION_UID?: string;
  ENVIRONMENT?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface Variables {
  prisma: PrismaClient;
  user: AuthUser;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: Variables;
}
