"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Search, BarChart3, Gauge, X, Save, Library, PenLine, Loader2 } from "lucide-react";
import { deleteItem, saveItem, searchCatalog, type CatalogHit } from "@/app/(app)/projects/[id]/requirement/actions";
import {
  CHART_TYPES,
  DEFAULT_COLORS,
  KIND_LABEL,
  WIDTHS,
  isChartKind,
  type ItemInput,
  type ItemRow,
  type PageInput,
} from "@/lib/requirement";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { withToast } from "@/components/ui/toast";
import { useSave, SaveStatus } from "./save-state";

const EMPTY: ItemInput = {
  kind: "kpi",
  catalogId: null,
  configurationId: null,
  title: "",
  description: "",
  formula: "",
  logic: "",
  pageKey: "",
  tab: "",
  width: "third",
  chartType: "",
  colors: DEFAULT_COLORS,
};

export function ItemsEditor({
  projectId,
  items,
  onItemsChange,
  pages,
}: {
  projectId: string;
  items: ItemRow[];
  onItemsChange: (items: ItemRow[]) => void;
  pages: PageInput[];
}) {
  const [editing, setEditing] = useState<ItemInput | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function saved(item: ItemRow) {
    onItemsChange(items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item]);
    setEditing(null);
  }

  async function remove(it: ItemRow) {
    if (!window.confirm(`Delete ${it.title}?`)) return;
    setDeleting(it.id);
    const r = await withToast(() => deleteItem(projectId, it.id), { pending: `Deleting ${it.title}`, done: `Deleted ${it.title}` });
    setDeleting(null);
    if (!r.error) {
      onItemsChange(items.filter((i) => i.id !== it.id));
      if (editing?.id === it.id) setEditing(null);
    }
  }
  const pageName = (key: string) => pages.find((p) => p.pageKey === key)?.name;

  const groups = useMemo(() => {
    const byPage = new Map<string, ItemRow[]>();
    for (const it of items) {
      const k = it.pageKey && pageName(it.pageKey) ? it.pageKey : "";
      byPage.set(k, [...(byPage.get(k) ?? []), it]);
    }
    return [...byPage.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, pages]);

  return (
    <div>
      {pages.length === 0 && (
        <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
          Pick pages first so you can place each KPI and chart on a page and tab.
        </p>
      )}

      {items.length === 0 && !editing && (
        <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm text-muted">
          No KPIs or charts yet. Add them from the Pulse catalog or describe a custom one.
        </p>
      )}

      <div className="space-y-5">
        {groups.map(([key, rows]) => (
          <div key={key || "unplaced"}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{key ? pageName(key) : "Not placed on a page yet"}</h3>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {rows.map((it) => (
                <li key={it.id} className="flex items-start gap-3 p-3.5">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    {isChartKind(it.kind) ? <BarChart3 className="size-4" /> : <Gauge className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{it.title}</span>
                      <Badge tone="gray">{KIND_LABEL[it.kind]}</Badge>
                      {it.chartType && <Badge tone="gray">{it.chartType}</Badge>}
                      {!it.catalogId && <Badge tone="amber">Custom</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {[it.tab && `Tab: ${it.tab}`, WIDTHS.find((w) => w.id === it.width)?.label, it.configurationId && `Config: ${it.configurationId}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {it.formula && <p className="mt-1 font-mono text-xs text-ink">= {it.formula}</p>}
                    {it.description && <p className="mt-1 text-sm text-muted">{it.description}</p>}
                    {isChartKind(it.kind) && it.colors.length > 0 && (
                      <span className="mt-1.5 flex gap-1">
                        {it.colors.map((c, i) => (
                          <span key={i} className="size-4 rounded-full ring-1 ring-line" style={{ background: c }} />
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => setEditing(it)} title="Edit" className="rounded-lg p-2 text-muted hover:bg-brand-50 hover:text-brand-700">
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      disabled={deleting === it.id}
                      onClick={() => remove(it)}
                      className="rounded-lg p-2 text-danger-600 hover:bg-danger-50 disabled:opacity-50"
                    >
                      {deleting === it.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {editing ? (
        <ItemForm
          key={editing.id ?? "new"}
          projectId={projectId}
          pages={pages}
          initial={editing}
          onSaved={saved}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setEditing({ ...EMPTY, kind: "kpi", pageKey: pages[0]?.pageKey ?? "" })}>
            <Plus />
            Add KPI card
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditing({ ...EMPTY, kind: "chart", chartType: "Bar", pageKey: pages[0]?.pageKey ?? "" })}>
            <Plus />
            Add chart
          </Button>
        </div>
      )}
    </div>
  );
}

function ItemForm({
  projectId,
  pages,
  initial,
  onSaved,
  onCancel,
}: {
  projectId: string;
  pages: PageInput[];
  initial: ItemInput;
  onSaved: (item: ItemRow) => void;
  onCancel: () => void;
}) {
  const [item, setItem] = useState<ItemInput>(initial);
  const [source, setSource] = useState<"catalog" | "custom">(initial.id && !initial.catalogId ? "custom" : "catalog");
  const save = useSave();
  const chart = isChartKind(item.kind);
  const tabs = pages.find((p) => p.pageKey === item.pageKey)?.tabs ?? [];
  const set = (c: Partial<ItemInput>) => setItem((prev) => ({ ...prev, ...c }));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), []);
  // Pages saved a moment ago arrive with the page refresh; default a new item onto the first one
  useEffect(() => {
    if (!initial.id && !item.pageKey && pages[0]) set({ pageKey: pages[0].pageKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  function pick(hit: CatalogHit) {
    set({
      kind: hit.kind,
      catalogId: hit.id,
      configurationId: hit.configurationId,
      title: hit.title?.trim() || hit.configurationId,
      description: hit.description ?? "",
      chartType: hit.kind === "kpi" ? "" : matchChartType(hit.chartType),
    });
  }

  return (
    <div ref={ref} className="mt-5 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink">{initial.id ? `Edit ${initial.title}` : chart ? "Add a chart" : "Add a KPI card"}</h3>
        <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-muted hover:bg-slate-100" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4 inline-flex rounded-xl border border-line bg-slate-50 p-1 text-sm">
        {(["catalog", "custom"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSource(s);
              if (s === "custom") set({ catalogId: null, configurationId: null, kind: chart ? "chart" : "kpi" });
            }}
            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5", source === s ? "bg-white font-medium text-ink shadow-sm" : "text-muted")}
          >
            {s === "catalog" ? <Library className="size-4" /> : <PenLine className="size-4" />}
            {s === "catalog" ? "From Pulse catalog" : "Custom"}
          </button>
        ))}
      </div>

      {source === "catalog" && <CatalogPicker group={chart ? "chart" : "kpi"} selectedId={item.catalogId} onPick={pick} />}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="item-title">Title</Label>
          <Input id="item-title" value={item.title} onChange={(e) => set({ title: e.target.value })} placeholder={chart ? "e.g. Secondary sales trend" : "e.g. Productive calls"} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="item-desc">Description</Label>
          <Textarea id="item-desc" value={item.description} onChange={(e) => set({ description: e.target.value })} className="min-h-16" placeholder="What it shows and who uses it" />
        </div>
        <div>
          <Label htmlFor="item-formula">Formula</Label>
          <Input id="item-formula" value={item.formula} onChange={(e) => set({ formula: e.target.value })} placeholder="e.g. PC / TC × 100" className="font-mono" />
        </div>
        <div>
          <Label htmlFor="item-logic">Logic</Label>
          <Input id="item-logic" value={item.logic} onChange={(e) => set({ logic: e.target.value })} placeholder="Filters, date range, exclusions" />
        </div>
        <div>
          <Label htmlFor="item-page">Page</Label>
          <Select id="item-page" value={item.pageKey} onChange={(e) => set({ pageKey: e.target.value, tab: "" })}>
            <option value="">Not placed yet</option>
            {pages.map((p) => (
              <option key={p.pageKey} value={p.pageKey}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="item-tab">Tab</Label>
          <Select id="item-tab" value={item.tab} onChange={(e) => set({ tab: e.target.value })} disabled={!tabs.length}>
            <option value="">{tabs.length ? "All tabs" : "No tabs on this page"}</option>
            {tabs.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="item-width">Size on the page</Label>
          <Select id="item-width" value={item.width} onChange={(e) => set({ width: e.target.value })}>
            {WIDTHS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </Select>
        </div>
        {chart && (
          <div>
            <Label htmlFor="item-type">Chart type</Label>
            <Select id="item-type" value={item.chartType} onChange={(e) => set({ chartType: e.target.value })}>
              <option value="">Pick a chart type</option>
              {CHART_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        )}
        {chart && (
          <div className="md:col-span-2">
            <Label>Colors</Label>
            <div className="flex flex-wrap items-center gap-3">
              {item.colors.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white py-1 pl-1 pr-2">
                  <input
                    type="color"
                    value={c}
                    onChange={(e) => set({ colors: item.colors.map((x, j) => (j === i ? e.target.value : x)) })}
                    className="size-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    aria-label={`Series ${i + 1} color`}
                  />
                  <span className="font-mono text-xs text-muted">{c}</span>
                  {item.colors.length > 1 && (
                    <button type="button" onClick={() => set({ colors: item.colors.filter((_, j) => j !== i) })} className="text-danger-600" aria-label="Remove color">
                      <X className="size-3.5" />
                    </button>
                  )}
                </span>
              ))}
              {item.colors.length < 6 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set({ colors: [...item.colors, "#94a3b8"] })}>
                  <Plus />
                  Color
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <SaveStatus {...save} />
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={save.pending || !item.title.trim()}
          onClick={() => {
            const name = item.title.trim();
            save.run(
              () => saveItem(projectId, item),
              initial.id
                ? { pending: `Saving changes to ${name}`, done: `Saved changes to ${name}` }
                : { pending: `Adding ${name}`, done: `Added ${name} to the requirement` },
              (r) => r.item && onSaved(r.item),
            );
          }}
        >
          {save.pending ? <Loader2 className="animate-spin" /> : <Save />}
          {initial.id ? "Save changes" : chart ? "Add chart" : "Add KPI"}
        </Button>
      </div>
    </div>
  );
}

function CatalogPicker({ group, selectedId, onPick }: { group: "kpi" | "chart"; selectedId: string | null; onPick: (h: CatalogHit) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CatalogHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const found = await searchCatalog(q, group).catch(() => [] as CatalogHit[]);
      if (live) {
        setHits(found);
        setLoading(false);
      }
    }, q ? 250 : 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, group]);

  return (
    <div className="mt-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${group === "kpi" ? "KPIs" : "charts"} by name or configuration id`} className="pl-9" />
        {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />}
      </div>
      <ul className="mt-2 max-h-60 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-white">
        {hits.length === 0 && !loading && <li className="p-3 text-sm text-muted">No matches. Switch to Custom to describe it yourself.</li>}
        {hits.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => onPick(h)}
              className={cn("flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-brand-50/60", selectedId === h.id && "bg-brand-50")}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{h.title?.trim() || h.configurationId}</span>
                <span className="block truncate text-xs text-muted">
                  {h.configurationId}
                  {h.description ? ` · ${h.description}` : ""}
                </span>
              </span>
              {h.chartType && <Badge tone="gray">{h.chartType}</Badge>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Maps Pulse chart type names (BarChart, LineChart...) to the builder's list. */
function matchChartType(raw: string | null) {
  const r = (raw ?? "").toLowerCase();
  if (r.includes("stack")) return "Stacked bar";
  if (r.includes("horizontal")) return "Horizontal bar";
  if (r.includes("combo") || r.includes("composite")) return "Combo (bar + line)";
  if (r.includes("donut") || r.includes("doughnut")) return "Donut";
  if (r.includes("pie")) return "Pie";
  if (r.includes("area")) return "Area";
  if (r.includes("line")) return "Line";
  if (r.includes("heat")) return "Heat map";
  if (r.includes("map")) return "Map";
  if (r.includes("funnel")) return "Funnel";
  if (r.includes("gauge")) return "Gauge";
  if (r.includes("table") || r.includes("grid")) return "Table";
  if (r.includes("bar") || r.includes("column")) return "Bar";
  return "";
}
