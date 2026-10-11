import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/db/url";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations need a direct (unpooled) connection when one is available
  dbCredentials: { url: databaseUrl({ direct: true }) },
});
