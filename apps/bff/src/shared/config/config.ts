type AppConfig = {
  oidc: {
    clientId: string;
    clientSecret: string;
    baseUri: string;
    redirectUri: string;
    scope: string;
  };
  cookie: {
    name: string;
    secret: string;
  };
  clientBaseRedirectUri: string;
  cors: {
    allowedOrigins: string[];
  };
  coreApi: {
    baseUrl: string;
  };
  proxy: {
    allowedPrefixes: string[];
    upstreamTimeoutMs: number;
  };
  region: string;
};

const REQUIRED_VARS = [
  "OIDC_CLIENT_ID",
  "OIDC_CLIENT_SECRET",
  "OIDC_BASE_URI",
  "OIDC_REDIRECT_URI",
  "OIDC_CLIENT_SCOPE",
  "COOKIE_NAME",
  "COOKIE_SECRET",
  "CLIENT_BASE_REDIRECT_URI",
  "CORE_API_BASE_URL",
  "PROXY_ALLOWED_PREFIXES",
  "REGION_CODE",
] as const;

const DEFAULT_PROXY_UPSTREAM_TIMEOUT_MS = 30_000;

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

function parsePrefixes(raw: string): string[] {
  const prefixes = parseListUrl(raw);
  if (prefixes.length === 0) {
    throw new Error("PROXY_ALLOWED_PREFIXES must contain at least one prefix");
  }
  for (const p of prefixes) {
    if (!p.startsWith("/")) {
      throw new Error(`PROXY_ALLOWED_PREFIXES entries must start with '/': got "${p}"`);
    }
  }
  return prefixes;
}

function parseTimeout(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_PROXY_UPSTREAM_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`PROXY_UPSTREAM_TIMEOUT_MS must be a positive number: got "${raw}"`);
  }
  return Math.floor(n);
}

function loadConfig(): AppConfig {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    oidc: {
      clientId: process.env.OIDC_CLIENT_ID!,
      clientSecret: process.env.OIDC_CLIENT_SECRET!,
      baseUri: process.env.OIDC_BASE_URI!,
      redirectUri: process.env.OIDC_REDIRECT_URI!,
      scope: process.env.OIDC_CLIENT_SCOPE!,
    },
    cookie: {
      name: process.env.COOKIE_NAME!,
      secret: process.env.COOKIE_SECRET!,
    },
    clientBaseRedirectUri: process.env.CLIENT_BASE_REDIRECT_URI!,
    cors: {
      allowedOrigins: parseCorsUrl(process.env.CORS_ALLOWED_ORIGINS),
    },
    coreApi: {
      baseUrl: process.env.CORE_API_BASE_URL!.replace(/\/+$/, ""),
    },
    proxy: {
      allowedPrefixes: parsePrefixes(process.env.PROXY_ALLOWED_PREFIXES!),
      upstreamTimeoutMs: parseTimeout(process.env.PROXY_UPSTREAM_TIMEOUT_MS),
    },
    region: process.env.REGION_CODE!,
  };
}

export { loadConfig };
export type { AppConfig };
