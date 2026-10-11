"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Send } from "lucide-react";
import type { ActionState } from "@/app/(app)/projects/actions";
import type { Branding, ItemRow, PageInput } from "@/lib/requirement";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActionForm } from "@/components/projects/action-form";
import { PagesEditor, type CatalogPage } from "./pages-editor";
import { ItemsEditor } from "./items-editor";
import { BrandingEditor } from "./branding-editor";
import { AddonsEditor } from "./addons-editor";

/**
 * The five builder sections. Each save returns what was stored and updates this state,
 * so the checklist and the KPI page picker stay current without reloading the page.
 */
export function RequirementBuilder({
  projectId,
  clientName,
  isDraft,
  canSubmit,
  submitAction,
  catalog,
  initial,
}: {
  projectId: string;
  clientName: string;
  isDraft: boolean;
  canSubmit: boolean;
  submitAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  catalog: CatalogPage[];
  initial: { pages: PageInput[]; items: ItemRow[]; branding: Branding; addons: Record<string, boolean>; addonNotes: Record<string, string> };
}) {
  const [pages, setPages] = useState(initial.pages);
  const [items, setItems] = useState(initial.items);
  const [hasLogo, setHasLogo] = useState(!!initial.branding.logo);

  const placed = (it: ItemRow) => !!it.pageKey && pages.some((p) => p.pageKey === it.pageKey);
  const checks = [
    { done: pages.length > 0, text: "At least one page picked" },
    { done: items.length > 0, text: "At least one KPI or chart added" },
    { done: items.length > 0 && items.every(placed), text: "Every KPI and chart placed on a page" },
    { done: hasLogo, text: "Client logo uploaded (optional)" },
  ];
  const ready = checks[0].done && checks[1].done;

  return (
    <div className="space-y-6">
      <Card id="pages" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle>1. Pages and tabs</CardTitle>
            <CardDescription>Which Pulse dashboard pages this client gets, and the tabs on each.</CardDescription>
          </div>
        </CardHeader>
        <CardBody>
          <PagesEditor projectId={projectId} catalog={catalog} initial={initial.pages} onSaved={setPages} />
        </CardBody>
      </Card>

      <Card id="items" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle>2. KPI cards and charts</CardTitle>
            <CardDescription>Pick from the Pulse catalog or describe a custom one. Set formula, logic, page, tab, size, chart type and colors.</CardDescription>
          </div>
        </CardHeader>
        <CardBody>
          <ItemsEditor projectId={projectId} items={items} onItemsChange={setItems} pages={pages} />
        </CardBody>
      </Card>

      <Card id="branding" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle>3. Branding</CardTitle>
            <CardDescription>The client&apos;s logo, name and colors on the dashboard.</CardDescription>
          </div>
        </CardHeader>
        <CardBody>
          <BrandingEditor projectId={projectId} initial={initial.branding} clientName={clientName} onSaved={(b) => setHasLogo(!!b.logo)} />
        </CardBody>
      </Card>

      <Card id="addons" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle>4. Add-ons</CardTitle>
            <CardDescription>Optional modules on top of the dashboard.</CardDescription>
          </div>
        </CardHeader>
        <CardBody>
          <AddonsEditor projectId={projectId} initial={initial.addons} initialNotes={initial.addonNotes} />
        </CardBody>
      </Card>

      <Card id="submit" className="scroll-mt-20">
        <CardHeader>
          <div>
            <CardTitle>5. {isDraft ? "Submit to Product" : "Changes are shared automatically"}</CardTitle>
            <CardDescription>
              {isDraft
                ? "When it's complete, hand it to Product. They get an email and pick an owner."
                : "This project is already with the delivery team. Each saved change shows on its timeline."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.text} className="flex items-center gap-2 text-sm">
                {c.done ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Circle className="size-4 text-slate-300" />}
                <span className={c.done ? "text-ink" : "text-muted"}>{c.text}</span>
              </li>
            ))}
          </ul>
          {canSubmit && (
            <div className="mt-5">
              {ready ? (
                <ActionForm
                  action={submitAction}
                  pendingText="Submitting the requirement to Product"
                  fields={[{ type: "note", label: "Note for Product (optional)", placeholder: "Go-live date the client expects, contacts, anything else" }]}
                  submit={
                    <>
                      <Send /> Submit to Product
                    </>
                  }
                />
              ) : (
                <p className="text-sm text-muted">Save at least one page and one KPI or chart to submit.</p>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
