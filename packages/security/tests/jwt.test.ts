import { describe, it, expect, beforeAll } from "vite-plus/test";
import { Hono } from "hono";
import { SignJWT, generateKeyPair } from "jose";
import type { CryptoKey } from "jose";

import { createAuthMiddleware, bearerToken, cookieToken } from "../src/jwt.js";

const ISSUER = "https://keycloak.test/realms/lnd";
const COOKIE_NAME = "test_session";

let priv: CryptoKey;
let pub: CryptoKey;
let otherPriv: CryptoKey;

beforeAll(async () => {
  const a = await generateKeyPair("RS256");
  priv = a.privateKey;
  pub = a.publicKey;
  const b = await generateKeyPair("RS256");
  otherPriv = b.privateKey;
});

function sign(key: CryptoKey, opts: { issuer?: string; expSecondsFromNow?: number } = {}) {
  const exp = Math.floor(Date.now() / 1000) + (opts.expSecondsFromNow ?? 3600);
  return new SignJWT({ sub: "u1" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setIssuer(opts.issuer ?? ISSUER)
    .setExpirationTime(exp)
    .sign(key);
}

describe("createAuthMiddleware with bearerToken", () => {
  function app() {
    const a = new Hono<any>();
    a.use("*", createAuthMiddleware({ issuer: ISSUER, getKey: pub, getToken: bearerToken() }));
    a.get("/", (c) => c.json({ sub: c.get("jwtPayload").sub }));
    return a;
  }

  it("verifies a valid token and sets jwtPayload", async () => {
    const token = await sign(priv);
    const res = await app().request("/", { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sub: "u1" });
  });

  it("401 when Authorization header is absent", async () => {
    const res = await app().request("/");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "token not found" });
  });

  it("401 when the scheme is not Bearer", async () => {
    const token = await sign(priv);
    const res = await app().request("/", { headers: { Authorization: `Basic ${token}` } });
    expect(res.status).toBe(401);
  });

  it("401 on a bad signature (signed by a different key)", async () => {
    const token = await sign(otherPriv);
    const res = await app().request("/", { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid token" });
  });

  it("401 token expired", async () => {
    const token = await sign(priv, { expSecondsFromNow: -10 });
    const res = await app().request("/", { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "token expired" });
  });

  it("401 on issuer mismatch", async () => {
    const token = await sign(priv, { issuer: "https://evil.test" });
    const res = await app().request("/", { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(401);
  });
});

describe("createAuthMiddleware with cookieToken", () => {
  function app(cookieName = COOKIE_NAME) {
    const a = new Hono<any>();
    a.use(
      "*",
      createAuthMiddleware({ issuer: ISSUER, getKey: pub, getToken: cookieToken(cookieName) }),
    );
    a.get("/", (c) => c.json({ sub: c.get("jwtPayload").sub }));
    return a;
  }

  it("401 'token not found' when the cookie is absent", async () => {
    const res = await app().request("/");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "token not found" });
  });

  it("401 'invalid token' for a malformed cookie value", async () => {
    const res = await app().request("/", {
      headers: { Cookie: `${COOKIE_NAME}_access_token=not-a-valid-jwt` },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid token" });
  });

  it("verifies a valid token read from the derived cookie name", async () => {
    const token = await sign(priv);
    const res = await app().request("/", {
      headers: { Cookie: `${COOKIE_NAME}_access_token=${token}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sub: "u1" });
  });

  it("uses the cookie name derived from config", async () => {
    const token = await sign(priv);
    const wrong = await app("custom_prefix").request("/", {
      headers: { Cookie: `wrong_prefix_access_token=${token}` },
    });
    expect(wrong.status).toBe(401);

    const correct = await app("custom_prefix").request("/", {
      headers: { Cookie: `custom_prefix_access_token=${token}` },
    });
    expect(correct.status).toBe(200);
  });
});
