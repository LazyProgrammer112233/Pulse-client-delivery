"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { parseCsv } from "@/lib/csv";

export type ImportState = { error?: string; ok?: string } | undefined;

/** Import Pulse companies from a CSV with columns Id (or CompanyId) and Name. Existing IDs get their name refreshed. */
export async function importClients(_: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  if (file.size > 5_000_000) return { error: "That file is over 5 MB." };
  const rows = parseCsv(await file.text());
  const values = rows
    .map((r) => ({ companyId: Number(r.companyid ?? r.id ?? r.company_id), name: (r.name ?? r.companyname ?? "").trim() }))
    .filter((r) => Number.isFinite(r.companyId) && r.companyId > 0 && r.name);
  if (!values.length) return { error: "No rows found. The CSV needs Id and Name columns." };

  for (let i = 0; i < values.length; i += 500) {
    await db
      .insert(schema.clients)
      .values(values.slice(i, i + 500).map((v) => ({ ...v, source: "pulse" as const })))
      .onConflictDoUpdate({ target: schema.clients.companyId, set: { name: sql`excluded.name`, source: sql`'pulse'` } });
  }
  revalidatePath("/clients");
  return { ok: `Imported ${values.length} clients.` };
}
