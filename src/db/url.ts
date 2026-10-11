/**
 * Finds the Postgres connection string. Vercel's Neon integration names its variables
 * DATABASE_URL / POSTGRES_URL, optionally with a custom prefix (e.g. STORAGE_DATABASE_URL),
 * so accept any of those instead of failing on one exact name.
 */
const POOLED = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "NEON_DATABASE_URL"];
const DIRECT = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DATABASE_URL_NON_POOLING"];

function find(names: string[]) {
  for (const n of names) if (process.env[n]) return process.env[n];
  // Prefixed variants such as STORAGE_DATABASE_URL or PULSE_POSTGRES_URL
  for (const [key, value] of Object.entries(process.env)) {
    if (value && names.some((n) => key.endsWith(`_${n}`))) return value;
  }
  return undefined;
}

export function databaseUrl({ direct = false } = {}) {
  const url = (direct ? find(DIRECT) : undefined) ?? find(POOLED);
  if (!url) {
    // Names only, never values: shows what the build can see when the connection is misnamed
    const seen = Object.keys(process.env).filter((k) => /DATABASE|POSTGRES|NEON|^PG/i.test(k));
    throw new Error(
      `Database-related variables visible to this build: ${seen.length ? seen.join(", ") : "none"}. ` +
      "No database connection string found. Connect a Neon database to this Vercel project " +
        "(Storage tab, enable it for Production and Preview), or set DATABASE_URL, then redeploy.",
    );
  }
  return url;
}
