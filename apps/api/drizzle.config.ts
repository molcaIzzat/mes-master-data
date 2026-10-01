import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/shared/database/migration",
  schema: "./src/shared/database/schema/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
