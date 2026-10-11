"use client";

import { useActionState, useMemo, useState } from "react";
import { Search, Building2, Plus, Check, Globe, Smartphone, Layers, AlertTriangle, X } from "lucide-react";
import { createProject, type FormState } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Client = { id: string; name: string; companyId: number | null };

const PRODUCTS = [
  { id: "web", label: "Pulse web dashboard", hint: "Control Tower pages, KPI cards and charts", icon: Globe },
  { id: "app", label: "Pulse app", hint: "Android app cards, pages and summaries", icon: Smartphone },
  { id: "both", label: "Both", hint: "Web dashboard and the Pulse app", icon: Layers },
] as const;

export function NewProjectForm({ clients }: { clients: Client[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createProject, undefined);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [manual, setManual] = useState(false);
  const [product, setProduct] = useState<string>("web");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? clients.filter((c) => c.name.toLowerCase().includes(q) || String(c.companyId ?? "").includes(q))
      : clients;
    return list.slice(0, 60);
  }, [clients, query]);

  return (
    <form action={action} className="space-y-6">
      <section className="card-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">1. Client</h2>
            <p className="text-sm text-muted">Pick a Pulse company or add a client that is not in the list yet.</p>
          </div>
          <Button
            type="button"
            variant={manual ? "outline" : "secondary"}
            size="sm"
            onClick={() => {
              setManual(!manual);
              setSelected(null);
            }}
          >
            {manual ? <Search /> : <Plus />}
            {manual ? "Pick from list" : "Add new client"}
          </Button>
        </div>

        {manual ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="newClientName">Client name</Label>
              <Input id="newClientName" name="newClientName" required placeholder="e.g. GIL Live" />
            </div>
            <div>
              <Label htmlFor="newCompanyId">Pulse company ID (optional)</Label>
              <Input id="newCompanyId" name="newCompanyId" inputMode="numeric" placeholder="e.g. 162257" />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <input type="hidden" name="clientId" value={selected?.id ?? ""} />
            {selected ? (
              <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Building2 className="size-4 text-brand-600" />
                  <span className="font-medium text-ink">{selected.name}</span>
                  {selected.companyId && <span className="text-sm text-muted">Company ID {selected.companyId}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1 text-muted hover:bg-white hover:text-ink"
                  aria-label="Change client"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${clients.length} clients by name or company ID`}
                    className="pl-10"
                  />
                </div>
                <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-white">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-brand-50"
                      >
                        <span className="text-ink">{c.name}</span>
                        <span className="text-xs text-muted">{c.companyId ? `ID ${c.companyId}` : "Manual"}</span>
                      </button>
                    </li>
                  ))}
                  {!matches.length && (
                    <li className="px-4 py-6 text-center text-sm text-muted">
                      No match. Use Add new client to create it.
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>
        )}
      </section>

      <section className="card-surface p-6">
        <h2 className="text-base font-semibold text-ink">2. What the client is getting</h2>
        <p className="text-sm text-muted">You can change this later while the project is a draft.</p>
        <input type="hidden" name="productType" value={product} />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {PRODUCTS.map(({ id, label, hint, icon: Icon }) => {
            const active = product === id;
            return (
              <button
                type="button"
                key={id}
                onClick={() => setProduct(id)}
                className={cn(
                  "relative flex flex-col items-start rounded-2xl border p-4 text-left transition",
                  active ? "border-brand-500 bg-brand-50 ring-4 ring-brand-100" : "border-line bg-white hover:border-brand-300",
                )}
              >
                {active && (
                  <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="size-3" />
                  </span>
                )}
                <Icon className={cn("size-5", active ? "text-brand-600" : "text-muted")} />
                <span className="mt-3 font-medium text-ink">{label}</span>
                <span className="mt-0.5 text-xs text-muted">{hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {state?.error && (
        <div role="alert" className="flex gap-3 rounded-xl border border-danger-100 bg-danger-50 p-3.5 text-sm text-danger-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending || (!manual && !selected)}>
          {pending ? "Creating..." : "Create draft project"}
        </Button>
      </div>
    </form>
  );
}
