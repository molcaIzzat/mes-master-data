import type { JWTPayload } from "jose";

// Superset of the Keycloak claims used across molca services. `resource_access`
// is optional so both token-based (post/comment) and cookie-based (bff) callers
// share one type; the extra org/email claims are only present on some realms.
type AppJwtPayload = JWTPayload & {
  resource_access?: Record<string, { roles: string[] }>;
  realm_access?: { roles: string[] };
  organization?: Record<string, { name: string; id: string }>;
  name?: string;
  preferred_username?: string;
  email?: string;
};

type AuthEnv = {
  Variables: {
    jwtPayload: AppJwtPayload;
  };
};

export type { AppJwtPayload, AuthEnv };
