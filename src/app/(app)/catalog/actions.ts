"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { parseCsv } from "@/lib/csv";
import type { ImportState } from "../clients/actions";

const KINDS = ["kpi", "chart", "dynamic_chart", "composite_chart"] as const;
type Kind = (typeof KINDS)[number];

/**
 * Import the Pulse KPI and chart catalog from a CSV with columns:
 * kind (kpi | chart | dynamic_chart | composite_chart), configurationId, title, description, chartType, outputType, database
 */
export async function importCatalog(_: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  if (file.size > 10_000_000) return { error: "That file is over 10 MB." };
  const rows = parseCsv(await file.text());
  const values = rows
    .map((r) => ({
      kind: (r.kind ?? "").toLowerCase() as Kind,
      configurationId: r.configurationid ?? r.configuration_id ?? "",
      title: r.title || null,
      description: r.description || null,
      chartType: r.charttype || r.chart_type || null,
      outputType: r.outputtype || r.output_type || null,
      database: r.database || null,
      active: true,
      syncedAt: new Date(),
    }))
    .filter((r) => KINDS.includes(r.kind) && r.configurationId);
  if (!values.length) return { error: "No rows found. Check the column names in the import guide." };

  for (let i = 0; i < values.length; i += 300) {
    await db
      .insert(schema.catalogItems)
      .values(values.slice(i, i + 300))
      .onConflictDoUpdate({
        target: [schema.catalogItems.kind, schema.catalogItems.configurationId],
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          chartType: sql`excluded.chart_type`,
          outputType: sql`excluded.output_type`,
          database: sql`excluded.database`,
          active: sql`true`,
          syncedAt: sql`now()`,
        },
      });
  }
  revalidatePath("/catalog");
  return { ok: `Imported ${values.length} catalog items.` };
}
