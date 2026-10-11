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
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { listProjects, type ProjectRow } from "@/lib/queries";
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
  const all = await listProjects();
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
    const withProduct = all.filter((p) => p.holdingTeam === "product" && p.status !== "product_assigned");
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
        <Section title="With Product" rows={withProduct} empty="Nothing in configuration or QA" />
      </>
    );
  }

  const devQueue = all.filter((p) => p.status === "in_development");
  const deployed = all.filter((p) => p.status === "deployed");
  return (
    <>
      <PageHeader title={`Hi ${firstName}`} description="Build what configuration cannot do and ship it to beta and prod." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="In development" value={devQueue.length} icon={Code2} hint="Handed to Tech by Product" />
        <StatCard label="Deployed, awaiting QA" value={deployed.length} icon={Rocket} hint="Back with Product soon" />
        <StatCard label="Overdue" value={[...devQueue, ...deployed].filter(isOverdue).length} icon={AlarmClock} tone="red" hint="Past target date" />
      </div>
      <Section title="Assigned to Tech" rows={devQueue} empty="No development work assigned" />
      <Section title="Deployed" rows={deployed} empty="Nothing deployed and waiting" />
    </>
  );
}
