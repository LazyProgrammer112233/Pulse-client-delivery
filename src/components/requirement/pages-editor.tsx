"use client";

import { useState } from "react";
import { Check, Plus, X, Save, LayoutTemplate, Loader2 } from "lucide-react";
import { savePages } from "@/app/(app)/projects/[id]/requirement/actions";
import type { PageInput } from "@/lib/requirement";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSave, SaveStatus } from "./save-state";

export type CatalogPage = { key: string; name: string; description: string | null; defaultTabs: string[]; usedBy: number };

export function PagesEditor({
  projectId,
  catalog,
  initial,
  onSaved,
}: {
  projectId: string;
  catalog: CatalogPage[];
  initial: PageInput[];
  onSaved: (pages: PageInput[]) => void;
}) {
  const [pages, setPages] = useState<PageInput[]>(initial);
  const save = useSave();
  const selected = new Map(pages.map((p) => [p.pageKey, p]));

  function update(next: PageInput[]) {
    setPages(next);
    save.markDirty();
  }

  function toggle(page: CatalogPage) {
    if (selected.has(page.key)) update(pages.filter((p) => p.pageKey !== page.key));
    else update([...pages, { pageKey: page.key, name: page.name, tabs: [...page.defaultTabs], notes: "" }]);
  }

  function patch(key: string, change: Partial<PageInput>) {
    update(pages.map((p) => (p.pageKey === key ? { ...p, ...change } : p)));
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {catalog.map((page) => {
          const on = selected.has(page.key);
          return (
            <button
              key={page.key}
              type="button"
              onClick={() => toggle(page)}
              aria-pressed={on}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-white p-3.5 text-left transition",
                on ? "border-brand-500 ring-4 ring-brand-100" : "border-line hover:border-brand-300",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                  on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white",
                )}
              >
                {on && <Check className="size-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-ink">{page.name}</span>
                <span className="mt-0.5 block text-xs text-muted">{page.description}</span>
                <span className="mt-1 block text-[11px] text-slate-400">Used by {page.usedBy} Pulse clients</span>
              </span>
            </button>
          );
        })}
      </div>

      {pages.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-ink">Tabs on each selected page</h3>
          {pages.map((p) => (
            <PageTabs key={p.pageKey} page={p} onChange={(c) => patch(p.pageKey, c)} onRemove={() => update(pages.filter((x) => x.pageKey !== p.pageKey))} />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <SaveStatus {...save} />
        <Button
          type="button"
          disabled={save.pending}
          onClick={() =>
            save.run(
              () => savePages(projectId, pages),
              { pending: "Saving pages and tabs", done: pages.length ? `Saved ${pages.length} page${pages.length === 1 ? "" : "s"} and their tabs` : "Pages saved" },
              (r) => {
                if (r.pages) {
                  setPages(r.pages);
                  onSaved(r.pages);
                }
              },
            )
          }
        >
          {save.pending ? <Loader2 className="animate-spin" /> : <Save />}
          Save pages
        </Button>
      </div>
    </div>
  );
}

function PageTabs({ page, onChange, onRemove }: { page: PageInput; onChange: (c: Partial<PageInput>) => void; onRemove: () => void }) {
  const [newTab, setNewTab] = useState("");
  const addTab = () => {
    const t = newTab.trim();
    if (t && !page.tabs.includes(t)) onChange({ tabs: [...page.tabs, t] });
    setNewTab("");
  };
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium text-ink">
          <LayoutTemplate className="size-4 text-brand-600" />
          {page.name}
        </span>
        <button type="button" onClick={onRemove} title="Remove page" className="rounded-lg p-1.5 text-danger-600 hover:bg-danger-50">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {page.tabs.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-sm text-brand-700">
            {t}
            <button
              type="button"
              onClick={() => onChange({ tabs: page.tabs.filter((x) => x !== t) })}
              className="rounded-full p-0.5 hover:bg-brand-100"
              aria-label={`Remove ${t} tab`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <Input
            value={newTab}
            onChange={(e) => setNewTab(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTab();
              }
            }}
            placeholder="Add a tab"
            className="h-8 w-32 text-sm"
          />
          <Button type="button" variant="ghost" size="sm" onClick={addTab} aria-label="Add tab">
            <Plus />
          </Button>
        </span>
      </div>
      <Textarea
        value={page.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Notes for this page (filters, default view, anything specific)"
        className="mt-3 min-h-16"
      />
    </div>
  );
}
