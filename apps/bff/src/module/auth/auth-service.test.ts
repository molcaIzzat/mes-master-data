import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import type { AppConfig } from "../../shared/config/config.js";

const TEST_CONFIG: AppConfig = {
  oidc: {
    clientId: "portal-bff",
    clientSecret: "secret",
    baseUri: "http://localhost:9099/realms/test",
    redirectUri: "http://localhost:3003/api/callback",
    scope: "openid profile email",
  },
  cookie: {
    name: "portal_session",
    secret: "supersecretvalue1234567890abcdef",
  },
  clientBaseRedirectUri: "http://localhost:3003",
  cors: {
    allowedOrigins: ["http://localhost:3003"],
  },
  coreApi: {
    baseUrl: "http://localhost:4000",
  },
  proxy: {
    allowedPrefixes: ["/v1/"],
    upstreamTimeoutMs: 30_000,
  },
  region: "sea",
};

const mockDiscoveryConfig = vi.hoisted(() => ({}) as any);
const mockAuthUrl = vi.hoisted(() => new URL("http://localhost:9099/auth?test=1"));
const mockEndSessionUrl = vi.hoisted(() => new URL("http://localhost:9099/logout?test=1"));
const mockTokenResponse = vi.hoisted(() => ({
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  id_token: "mock-id-token",
}));

vi.mock("openid-client", () => ({
  discovery: vi.fn(() => Promise.resolve(mockDiscoveryConfig)),
  allowInsecureRequests: vi.fn(() => {}),
  buildAuthorizationUrl: vi.fn(() => mockAuthUrl),
  authorizationCodeGrant: vi.fn(() => Promise.resolve(mockTokenResponse)),
  refreshTokenGrant: vi.fn(() => Promise.resolve(mockTokenResponse)),
  buildEndSessionUrl: vi.fn(() => mockEndSessionUrl),
}));

import { createAuthService, resetCachedConfig } from "./auth-service.js";
import * as oidc from "openid-client";

describe("AuthService", () => {
  beforeEach(() => {
    resetCachedConfig();
    vi.clearAllMocks();
  });

  describe("getConfig", () => {
    it("should call discovery on first invocation", async () => {
      const service = createAuthService(TEST_CONFIG);
      await service.getConfig();

      expect(oidc.discovery).toHaveBeenCalledTimes(1);
    });

    it("should cache discovery config on subsequent calls", async () => {
      const service = createAuthService(TEST_CONFIG);
      await service.getConfig();
      await service.getConfig();

      expect(oidc.discovery).toHaveBeenCalledTimes(1);
    });

    it("should register allowInsecureRequests with discovery for http URLs", async () => {
      const service = createAuthService(TEST_CONFIG);
      await service.getConfig();

      expect(oidc.discovery).toHaveBeenCalledWith(
        new URL(TEST_CONFIG.oidc.baseUri),
        TEST_CONFIG.oidc.clientId,
        TEST_CONFIG.oidc.clientSecret,
        undefined,
        { execute: [oidc.allowInsecureRequests] },
      );
    });
  });

  describe("buildLoginUrl", () => {
    it("should return the authorization URL from openid-client", async () => {
      const service = createAuthService(TEST_CONFIG);
      const url = await service.buildLoginUrl("challenge", "state1", "nonce1");

      expect(url.toString()).toBe(mockAuthUrl.toString());
      expect(oidc.buildAuthorizationUrl).toHaveBeenCalledWith(mockDiscoveryConfig, {
        redirect_uri: TEST_CONFIG.oidc.redirectUri,
        scope: TEST_CONFIG.oidc.scope,
        code_challenge: "challenge",
        code_challenge_method: "S256",
        state: "state1",
        nonce: "nonce1",
      });
    });
  });

  describe("exchangeCode", () => {
    it("should return a normalized token set", async () => {
      const service = createAuthService(TEST_CONFIG);
      const callbackUrl = new URL("http://localhost:3003/api/callback?code=abc&state=s1");

      const result = await service.exchangeCode(callbackUrl, "verifier", "s1", "n1");

      expect(result.accessToken).toBe("mock-access-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
      expect(result.idToken).toBe("mock-id-token");
      expect(oidc.authorizationCodeGrant).toHaveBeenCalledWith(mockDiscoveryConfig, callbackUrl, {
        pkceCodeVerifier: "verifier",
        expectedState: "s1",
        expectedNonce: "n1",
      });
    });
  });

  describe("refreshToken", () => {
    it("should return a normalized token set from refresh grant", async () => {
      const service = createAuthService(TEST_CONFIG);
      const result = await service.refreshToken("old-refresh-token");

      expect(result.accessToken).toBe("mock-access-token");
      expect(oidc.refreshTokenGrant).toHaveBeenCalledWith(mockDiscoveryConfig, "old-refresh-token");
    });
  });

  describe("buildLogoutUrl", () => {
    it("should build end session URL with id_token_hint", async () => {
      const service = createAuthService(TEST_CONFIG);
      const url = await service.buildLogoutUrl("my-id-token");

      expect(url.toString()).toBe(mockEndSessionUrl.toString());
      expect(oidc.buildEndSessionUrl).toHaveBeenCalledWith(mockDiscoveryConfig, {
        post_logout_redirect_uri: TEST_CONFIG.clientBaseRedirectUri,
        id_token_hint: "my-id-token",
      });
    });

    it("should build end session URL without id_token_hint when not provided", async () => {
      const service = createAuthService(TEST_CONFIG);
      await service.buildLogoutUrl();

      expect(oidc.buildEndSessionUrl).toHaveBeenCalledWith(mockDiscoveryConfig, {
        post_logout_redirect_uri: TEST_CONFIG.clientBaseRedirectUri,
      });
    });
  });
});
