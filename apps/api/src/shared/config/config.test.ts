import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { loadConfig } from "./config.js";

const VALID_ENV = {
  OIDC_HOST: "http://localhost:9099/realms/test",
  OIDC_BASE_URI: "http://localhost:9099/realms/test",
  OIDC_TOKEN_URI: "http://localhost:9099/realms/test",
  OIDC_CLIENT_ID: "clientId",
  OIDC_CLIENT_SECRET: "clientSecret",
  DATABASE_URL: "postgresql://user:password@localhost:5432/my-database",
  KEYCLOAK_TIMEOUT: "30000",
  KEYCLOAK_REALMS: "lnd",
  REGION_CODE: "sea",
  APPLICATION_ALIAS: "library-test",
};

describe("loadConfig", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    for (const [key, value] of Object.entries(VALID_ENV)) {
      process.env[key] = value;
    }
    delete process.env.PROXY_UPSTREAM_TIMEOUT_MS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should load all config values from environment", () => {
    const config = loadConfig();

    expect(config.oidc.baseUri).toBe("http://localhost:9099/realms/test");
    expect(config.region).toBe("sea");
  });

  it("should throw if a single required variable is missing", () => {
    delete process.env.OIDC_BASE_URI;

    expect(() => loadConfig()).toThrow("Missing required environment variables: OIDC_BASE_URI");
  });

  it("should throw if REGION_CODE is missing", () => {
    delete process.env.REGION_CODE;

    expect(() => loadConfig()).toThrow("Missing required environment variables: REGION_CODE");
  });

  it("should throw when all variables are missing", () => {
    for (const key of Object.keys(VALID_ENV)) {
      delete process.env[key];
    }

    expect(() => loadConfig()).toThrow("Missing required environment variables:");
  });
});
