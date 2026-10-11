import { BarChart3, Gauge, LayoutTemplate, Puzzle, Palette } from "lucide-react";
import type { Requirement } from "@/lib/queries";
import { ADDONS, KIND_LABEL, WIDTHS, isChartKind } from "@/lib/requirement";
import { Badge } from "@/components/ui/badge";

/** Read-only view of the full requirement, grouped by page. */
export function RequirementSummary({ req, clientName }: { req: Requirement; clientName: string }) {
  const addons = ADDONS.filter((a) => req.addons[a.id]);
  const unplaced = req.items.filter((i) => !req.pages.some((p) => p.pageKey === i.pageKey));
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <LayoutTemplate className="size-4 text-brand-600" /> Pages, KPIs and charts
        </h3>
        {req.pages.length === 0 && req.items.length === 0 ? (
          <p className="text-sm text-muted">Nothing captured yet.</p>
        ) : (
          <div className="space-y-3">
            {[...req.pages.map((p) => ({ ...p, rows: req.items.filter((i) => i.pageKey === p.pageKey) })), ...(unplaced.length ? [{ pageKey: "", name: "Not placed on a page", tabs: [], notes: "", rows: unplaced }] : [])].map((p) => (
              <div key={p.pageKey || "unplaced"} className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{p.name}</span>
                  {p.tabs.map((t) => (
                    <Badge key={t} tone="gray">
                      {t}
                    </Badge>
                  ))}
                </div>
                {p.notes && <p className="mt-1 text-sm text-muted">{p.notes}</p>}
                {p.rows.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {p.rows.map((i) => (
                      <li key={i.id} className="flex gap-2.5 text-sm">
                        {isChartKind(i.kind) ? <BarChart3 className="mt-0.5 size-4 shrink-0 text-brand-500" /> : <Gauge className="mt-0.5 size-4 shrink-0 text-brand-500" />}
                        <div className="min-w-0">
                          <p>
                            <span className="font-medium text-ink">{i.title}</span>{" "}
                            <span className="text-muted">
                              {[KIND_LABEL[i.kind], i.chartType, i.tab && `${i.tab} tab`, WIDTHS.find((w) => w.id === i.width)?.label, i.catalogId ? i.configurationId : "custom"]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </p>
                          {i.formula && <p className="font-mono text-xs text-ink">= {i.formula}</p>}
                          {i.logic && <p className="text-xs text-muted">Logic: {i.logic}</p>}
                          {i.description && <p className="text-xs text-muted">{i.description}</p>}
                          {isChartKind(i.kind) && i.colors.length > 0 && (
                            <span className="mt-1 flex gap-1">
                              {i.colors.map((c, n) => (
                                <span key={n} className="size-3.5 rounded-full ring-1 ring-line" style={{ background: c }} />
                              ))}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <Palette className="size-4 text-brand-600" /> Branding
          </h3>
          <div className="flex items-center gap-3">
            {req.branding.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={req.branding.logo} alt="Client logo" className="h-10 max-w-28 object-contain" />
            ) : (
              <span className="text-sm text-muted">No logo</span>
            )}
            <span className="text-sm text-ink">{req.branding.displayName || clientName}</span>
            {[req.branding.primaryColor, req.branding.secondaryColor].filter(Boolean).map((c) => (
              <span key={c} className="size-5 rounded-full ring-1 ring-line" style={{ background: c }} title={c} />
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-line bg-white p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <Puzzle className="size-4 text-brand-600" /> Add-ons
          </h3>
          {addons.length === 0 ? (
            <p className="text-sm text-muted">None</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {addons.map((a) => (
                <li key={a.id}>
                  <span className="font-medium text-ink">{a.name}</span>
                  {req.addonNotes[a.id] && <span className="text-muted">: {req.addonNotes[a.id]}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
