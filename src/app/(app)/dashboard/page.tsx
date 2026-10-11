import Link from "next/link";
import {
  Plus,
  FilePen,
  ClipboardCheck,
  Truck,
  BadgeCheck,
  UserPlus,
  Briefcase,
  AlarmClock,
  Timer,
  Code2,
  Rocket,
  Inbox,
  Link2,
  ArrowRight,
  CalendarClock,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { listAdoLinks, listProjects, type ProjectRow } from "@/lib/queries";
import { techOnly } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/projects/status-badge";
import type { ProjectStatus } from "@/lib/status";
import { PageHeader, EmptyState } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ProjectTable } from "@/components/projects/project-table";
import { buttonClasses } from "@/components/ui/button";

const ACTIVE: ProjectStatus[] = [
  "product_assigned",
  "estimating",
  "configuring",
  "in_development",
  "deployed",
  "product_qa",
  "cst_review",
  "changes_requested",
];

const isOverdue = (p: ProjectRow) =>
  !!p.targetDate && p.status !== "live" && p.status !== "cancelled" && new Date(p.targetDate) < new Date(new Date().toDateString());

function Section({ title, rows, empty }: { title: string; rows: ProjectRow[]; empty: string }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {title} <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{rows.length}</span>
      </h2>
      {rows.length ? <ProjectTable rows={rows} /> : <EmptyState icon={Inbox} title={empty} />}
    </section>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const all = await listProjects({ forTech: techOnly(user) });
  const firstName = user.name?.split(" ")[0] ?? "there";

  if (user.team === "cst") {
    const drafts = all.filter((p) => p.status === "draft");
    const review = all.filter((p) => p.status === "cst_review");
    const inDelivery = all.filter((p) => ACTIVE.includes(p.status) && p.status !== "cst_review");
    const live = all.filter((p) => p.status === "live");
    return (
      <>
        <PageHeader
          title={`Hi ${firstName}`}
          description="Bring in new clients and review what Product and Tech deliver."
          actions={
            <Link href="/projects/new" className={buttonClasses("primary")}>
              <Plus />
              New client project
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Drafts" value={drafts.length} icon={FilePen} hint="Requirements still being captured" />
          <StatCard label="Awaiting your review" value={review.length} icon={ClipboardCheck} hint="Delivered and ready to check" />
          <StatCard label="In delivery" value={inDelivery.length} icon={Truck} hint="With Product or Tech" />
          <StatCard label="Live" value={live.length} icon={BadgeCheck} hint="Signed off" />
        </div>
        <Section title="Waiting on you" rows={[...review, ...drafts]} empty="Nothing waiting on CST right now" />
        <Section title="In delivery" rows={inDelivery} empty="No projects with Product or Tech yet" />
      </>
    );
  }

  if (user.team === "product") {
    const unassigned = all.filter((p) => p.status === "product_assigned");
    const mine = all.filter((p) => p.ownerEmail === user.email && ACTIVE.includes(p.status));
    const overdue = all.filter(isOverdue);
    const manDays = all
      .filter((p) => ACTIVE.includes(p.status))
      .reduce((sum, p) => sum + Number(p.estimateManDays ?? 0), 0);
    const withProduct = all.filter(
      (p) =>
        (p.holdingTeam === "product" && p.status !== "product_assigned") ||
        (p.status === "cst_review" && p.extraRoundRequested && !p.extraRoundApprovedBy),
    );
    return (
      <>
        <PageHeader title={`Hi ${firstName}`} description="Own client projects, estimate effort and keep deadlines honest." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Needs an owner" value={unassigned.length} icon={UserPlus} hint="Assigned to Product by CST" />
          <StatCard label="My projects" value={mine.length} icon={Briefcase} hint="Where you are product owner" />
          <StatCard label="Overdue" value={overdue.length} icon={AlarmClock} tone={overdue.length ? "red" : "blue"} hint="Past target date" />
          <StatCard label="Man-days in flight" value={manDays} icon={Timer} hint="Estimated across active projects" />
        </div>
        <Section title="Needs a product owner" rows={unassigned} empty="Every project has an owner" />
        <Section title="With Product" rows={withProduct} empty="Nothing in estimation, configuration or QA" />
      </>
    );
  }

  const devQueue = all.filter((p) => p.status === "in_development");
  const elsewhere = all.filter((p) => p.status !== "in_development");
  const ado = await listAdoLinks(devQueue.map((p) => p.id));
  return (
    <>
      <PageHeader title={`Hi ${firstName}`} description="Projects Product has handed to Tech. Open the Azure DevOps PBIs, build, deploy to beta or prod, then hand back." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="To build" value={devQueue.length} icon={Code2} hint="Handed to Tech by Product" />
        <StatCard label="Handed back" value={elsewhere.length} icon={Rocket} hint="With Product or CST now" />
        <StatCard label="Overdue" value={devQueue.filter(isOverdue).length} icon={AlarmClock} tone="red" hint="Past target date" />
      </div>
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          To build <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{devQueue.length}</span>
        </h2>
        {devQueue.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {devQueue.map((p) => (
              <TechCard key={p.id} project={p} links={ado.filter((l) => l.projectId === p.id)} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Inbox} title="Nothing to build right now">
            Projects show up here when Product hands development to Tech.
          </EmptyState>
        )}
      </section>
      <Section title="Handed back, still running" rows={elsewhere} empty="Nothing you've worked on is in QA or review" />
    </>
  );
}

/** One project in Tech's queue, with its Azure DevOps PBIs one click away. */
function TechCard({ project: p, links }: { project: ProjectRow; links: { url: string; label: string }[] }) {
  return (
    <div className="card-surface flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{p.clientName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" /> {p.ownerName ?? p.ownerEmail ?? "No owner"}
            </span>
            <span className={`inline-flex items-center gap-1 ${isOverdue(p) ? "text-danger-600" : ""}`}>
              <CalendarClock className="size-3.5" /> {p.targetDate ? `Due ${formatDate(p.targetDate)}` : "No deadline"}
            </span>
          </div>
        </div>
        <StatusBadge status={p.status} />
      </div>
      <div className="mt-4 flex-1">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Azure DevOps</p>
        {links.length ? (
          <ul className="space-y-1.5">
            {links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
                  <Link2 className="size-4 shrink-0" />
                  <span className="truncate">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No PBI linked yet. Ask the product owner to attach one.</p>
        )}
      </div>
      <Link href={`/projects/${p.id}`} className={buttonClasses("secondary", "md", "mt-4 self-start")}>
        Open project
        <ArrowRight />
      </Link>
    </div>
  );
}
