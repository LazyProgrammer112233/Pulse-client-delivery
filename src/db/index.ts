import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// prepare:false keeps it compatible with Neon's pooled (pgbouncer) connection string
const client =
  globalForDb.pg ?? postgres(process.env.DATABASE_URL!, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
