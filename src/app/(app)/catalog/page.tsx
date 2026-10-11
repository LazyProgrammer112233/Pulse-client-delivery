import { asc, desc, sql } from "drizzle-orm";
import { Library, Gauge, BarChart3, Combine, LayoutPanelTop } from "lucide-react";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { importCatalog } from "./actions";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { CsvImport } from "@/components/admin/csv-import";

export default async function CatalogPage() {
  const user = await requireUser();
  const [pages, counts] = await Promise.all([
    db.select().from(schema.catalogPages).orderBy(desc(schema.catalogPages.usedBy), asc(schema.catalogPages.name)),
    db
      .select({ kind: schema.catalogItems.kind, n: sql<number>`count(*)::int` })
      .from(schema.catalogItems)
      .groupBy(schema.catalogItems.kind),
  ]);
  const count = (k: string) => counts.find((c) => c.kind === k)?.n ?? 0;

  return (
    <>
      <PageHeader
        title="Pulse catalog"
        description="What CST can pick from when capturing a client's requirement: dashboard pages, KPI cards and charts."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Dashboard pages" value={pages.length} icon={LayoutPanelTop} hint="Control Tower page types" />
        <StatCard label="KPI cards" value={count("kpi")} icon={Gauge} hint="PulseKpiConfigurations" />
        <StatCard label="Charts" value={count("chart") + count("dynamic_chart")} icon={BarChart3} hint="Chart and dynamic chart configs" />
        <StatCard label="Composite charts" value={count("composite_chart")} icon={Combine} hint="Built from other charts" />
      </div>

      {user.isAdmin && (
        <div className="mt-6">
          <CsvImport
            title="Import KPI and chart catalog"
            action={importCatalog}
            help={
              <>
                CSV columns: <code className="rounded bg-brand-50 px-1 text-brand-700">kind</code> (kpi, chart, dynamic_chart,
                composite_chart), <code className="rounded bg-brand-50 px-1 text-brand-700">configurationId</code>, title,
                description, chartType, outputType, database. The README has the SQL that exports it.
              </>
            }
          />
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Dashboard pages</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((p) => (
          <div key={p.key} className="card-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Library className="size-4" />
                </span>
                <p className="font-semibold text-ink">{p.name}</p>
              </div>
              <Badge tone="gray">{p.usedBy} clients</Badge>
            </div>
            {p.description && <p className="mt-3 text-sm text-muted">{p.description}</p>}
            {p.defaultTabs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.defaultTabs.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
