import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LayoutTemplate, BarChart3, Palette, Puzzle, Send, CheckCircle2, Circle, Lock } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getProject, getRequirement, listCatalogPages } from "@/lib/queries";
import { canEditRequirement, isTeam } from "@/lib/workflow";
import { advance } from "../../actions";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/projects/status-badge";
import { ActionForm } from "@/components/projects/action-form";
import { Alert } from "@/components/ui/alert";
import { PagesEditor } from "@/components/requirement/pages-editor";
import { ItemsEditor } from "@/components/requirement/items-editor";
import { BrandingEditor } from "@/components/requirement/branding-editor";
import { AddonsEditor } from "@/components/requirement/addons-editor";
import { RequirementSummary } from "@/components/requirement/requirement-summary";

const SECTIONS = [
  { id: "pages", label: "Pages", icon: LayoutTemplate },
  { id: "items", label: "KPIs and charts", icon: BarChart3 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "addons", label: "Add-ons", icon: Puzzle },
  { id: "submit", label: "Submit", icon: Send },
];

export default async function RequirementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser();
  const [data, req, catalog] = await Promise.all([getProject(id), getRequirement(id), listCatalogPages()]);
  if (!data) notFound();
  const { project, client } = data;
  const editable = canEditRequirement(user, project);

  const header = (
    <div className="mb-6">
      <Link href={`/projects/${id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand-700">
        <ArrowLeft className="size-4" /> Back to {client.name}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Requirement</h1>
        <StatusBadge status={project.status} />
      </div>
      <p className="mt-1 text-sm text-muted">
        {editable
          ? "Pick the pages, then add each KPI card and chart with its formula, logic and place on the page. Every section saves on its own."
          : "Read-only. The requirement can be edited by CST while it's a draft, and by CST or Product during delivery."}
      </p>
    </div>
  );

  if (!editable) {
    return (
      <>
        {header}
        {(project.status === "live" || project.status === "cancelled") && (
          <Alert tone="info" className="mb-4">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-4" /> This project is closed, so its requirement is locked.
            </span>
          </Alert>
        )}
        <RequirementSummary req={req} clientName={client.name} />
      </>
    );
  }

  const checks = [
    { done: req.pages.length > 0, text: "At least one page picked" },
    { done: req.items.length > 0, text: "At least one KPI or chart added" },
    { done: req.items.length > 0 && req.items.every((i) => i.pageKey), text: "Every KPI and chart placed on a page" },
    { done: !!req.branding.logo, text: "Client logo uploaded (optional)" },
  ];
  const ready = checks[0].done && checks[1].done;

  return (
    <>
      {header}
      <nav className="sticky top-0 z-10 -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        {SECTIONS.map(({ id: s, label, icon: Icon }, i) => (
          <a key={s} href={`#${s}`} className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-brand-50 hover:text-brand-700">
            <span className="flex size-5 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">{i + 1}</span>
            <Icon className="size-4" />
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        <Card id="pages" className="scroll-mt-20">
          <CardHeader>
            <div>
              <CardTitle>1. Pages and tabs</CardTitle>
              <CardDescription>Which Pulse dashboard pages this client gets, and the tabs on each.</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            <PagesEditor projectId={id} catalog={catalog} initial={req.pages} />
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
            <ItemsEditor projectId={id} items={req.items} pages={req.pages} />
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
            <BrandingEditor projectId={id} initial={req.branding} clientName={client.name} />
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
            <AddonsEditor projectId={id} initial={req.addons} initialNotes={req.addonNotes} />
          </CardBody>
        </Card>

        <Card id="submit" className="scroll-mt-20">
          <CardHeader>
            <div>
              <CardTitle>5. {project.status === "draft" ? "Submit to Product" : "Changes are shared automatically"}</CardTitle>
              <CardDescription>
                {project.status === "draft"
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
            {project.status === "draft" && isTeam(user, "cst") && (
              <div className="mt-5">
                {ready ? (
                  <ActionForm
                    action={advance.bind(null, id, "submit")}
                    fields={[{ type: "note", label: "Note for Product (optional)", placeholder: "Go-live date the client expects, contacts, anything else" }]}
                    submit={<><Send /> Submit to Product</>}
                  />
                ) : (
                  <p className="text-sm text-muted">Save at least one page and one KPI or chart to submit.</p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
