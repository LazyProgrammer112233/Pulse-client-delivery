import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LayoutTemplate, BarChart3, Palette, Puzzle, Send, Lock } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getProject, getRequirement, listCatalogPages } from "@/lib/queries";
import { canEditRequirement, isTeam } from "@/lib/workflow";
import { advance } from "../../actions";
import { StatusBadge } from "@/components/projects/status-badge";
import { Alert } from "@/components/ui/alert";
import { RequirementBuilder } from "@/components/requirement/requirement-builder";
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

      <RequirementBuilder
        projectId={id}
        clientName={client.name}
        isDraft={project.status === "draft"}
        canSubmit={project.status === "draft" && isTeam(user, "cst")}
        submitAction={advance.bind(null, id, "submit")}
        catalog={catalog.map((c) => ({ key: c.key, name: c.name, description: c.description, defaultTabs: Array.isArray(c.defaultTabs) ? c.defaultTabs : [], usedBy: c.usedBy }))}
        initial={req}
      />
    </>
  );
}
