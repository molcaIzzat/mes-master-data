type AppConfig = {
  applicationAlias: string;
  region: string;
  database: {
    url: string;
    logger: boolean;
    maxConnection: number;
    idleTimeoutMs: number;
    connectTimeoutMs: number;
  };
  oidc: {
    host: string;
    baseUri: string;
    tokenUri: string;
    clientId: string;
    clientSecret: string;
  };
  cors: {
    allowedOrigins: string[];
  };
  keycloak: {
    realms: string;
    timeout: number;
  };
  // Opt-in inbound token checks, both undefined by default so the middleware
  // behaves exactly as it did before they existed.
  //
  // This service is the callee for cross-service traffic (mes-oee-monitor calls
  // it with a client_credentials token), and until now it verified only
  // signature, issuer and expiry — any token from the realm was accepted. These
  // narrow that to a named audience and an allowlist of client ids.
  //
  // ORDER MATTERS: Keycloak emits `aud: ["account"]` by default, so enabling
  // `audience` before the realm has an audience mapper 401s every caller,
  // browser sessions included.
  auth: {
    audience?: string;
    allowedAzp?: string[];
  };
};

const DEFAULT_KEYCLOAK_TIMEOUT = 30_000;
const DEFAULT_DB_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_DB_MAX_CONN = 20;
const DEFAULT_DB_CONN_TIMEOUT_MS = 5_000;

function parseDbIdleTimeout(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_DB_IDLE_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`DATABASE_IDLE_TIMEOUT_MS must be a positive number: got "${raw}"`);
  }
  return Math.floor(n);
}

function parseDbConnTimeout(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_DB_CONN_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`DATABASE_CONN_TIMEOUT_MS must be a positive number: got "${raw}"`);
  }
  return Math.floor(n);
}

function parseDbMaxConn(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_DB_MAX_CONN;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`DATABASE_MAX_CONN must be a positive number: got "${raw}"`);
  }
  return Math.floor(n);
}

function parseTimeout(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_KEYCLOAK_TIMEOUT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`KEYCLOAK_TIMEOUT must be a positive number: got "${raw}"`);
  }
  return Math.floor(n);
}

function parseListUrl(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function parseCorsUrl(raw?: string): string[] {
  const corsUrls = parseListUrl(raw ?? "");
  const allowedOrigins = corsUrls.length === 0 ? ["http://localhost:3000"] : corsUrls;
  return allowedOrigins;
}

// An unset or blank value must stay undefined rather than becoming [], because
// an empty allowlist would reject every caller instead of checking nothing.
function parseOptionalList(raw?: string): string[] | undefined {
  const items = parseListUrl(raw ?? "");
  return items.length === 0 ? undefined : items;
}

function parseOptional(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

const REQUIRED_VARS = [
  "OIDC_HOST",
  "OIDC_BASE_URI",
  "OIDC_TOKEN_URI",
  "OIDC_CLIENT_ID",
  "OIDC_CLIENT_SECRET",
  "DATABASE_URL",
  "KEYCLOAK_REALMS",
  "REGION_CODE",
  "APPLICATION_ALIAS",
] as const;

function loadConfig(): AppConfig {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    applicationAlias: process.env.APPLICATION_ALIAS!,
    database: {
      url: process.env.DATABASE_URL!,
      logger: process.env.NODE_ENV === "development",
      maxConnection: parseDbMaxConn(process.env.DATABASE_MAX_CONN),
      idleTimeoutMs: parseDbIdleTimeout(process.env.DATABASE_IDLE_TIMEOUT_MS),
      connectTimeoutMs: parseDbConnTimeout(process.env.DATABASE_CONN_TIMEOUT_MS),
    },
    oidc: {
      host: process.env.OIDC_HOST!,
      baseUri: process.env.OIDC_BASE_URI!,
      clientId: process.env.OIDC_CLIENT_ID!,
      clientSecret: process.env.OIDC_CLIENT_SECRET!,
      tokenUri: process.env.OIDC_TOKEN_URI!,
    },
    cors: {
      allowedOrigins: parseCorsUrl(process.env.CORS_ALLOWED_ORIGINS),
    },
    auth: {
      audience: parseOptional(process.env.AUTH_AUDIENCE),
      allowedAzp: parseOptionalList(process.env.AUTH_ALLOWED_AZP),
    },
    keycloak: {
      realms: process.env.KEYCLOAK_REALMS!,
      timeout: parseTimeout(process.env.KEYCLOAK_TIMEOUT),
    },
    region: process.env.REGION_CODE!,
  };
}

export { loadConfig };
export type { AppConfig };
