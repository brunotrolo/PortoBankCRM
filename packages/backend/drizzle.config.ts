import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/database/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/porto_bank_crm",
  },
  verbose: true,
  strict: true,
});
