import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listProjects } from "@/lib/queries";
import { STATUS, type ProjectStatus } from "@/lib/status";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ProjectTable } from "@/components/projects/project-table";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TECH_HIDDEN, techOnly } from "@/lib/workflow";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const { status } = await searchParams;
  const filter = status && status in STATUS ? (status as ProjectStatus) : undefined;
  const tech = techOnly(user);
  const rows = await listProjects({ forTech: tech, ...(filter ? { statuses: [filter] } : {}) });
  const canCreate = user.team === "cst" || user.isAdmin;
  const statuses = (Object.keys(STATUS) as ProjectStatus[]).filter((s) => !tech || !TECH_HIDDEN.includes(s));

  return (
    <>
      <PageHeader
        title="Projects"
        description={tech ? "Projects Product has handed to Tech that are still running, newest activity first." : "Every client delivery, newest activity first."}
        actions={
          canCreate && (
            <Link href="/projects/new" className={buttonClasses("primary")}>
              <Plus />
              New client project
            </Link>
          )
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/projects"
          className={cn(
            "rounded-full px-3 py-1 text-sm",
            !filter ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line hover:text-brand-700",
          )}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/projects?status=${s}`}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              filter === s ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line hover:text-brand-700",
            )}
          >
            {STATUS[s].label}
          </Link>
        ))}
      </div>
      {rows.length ? (
        <ProjectTable rows={rows} />
      ) : (
        <EmptyState icon={FolderKanban} title="No projects here yet">
          {canCreate
            ? "Start one with New client project."
            : tech
              ? "Projects show up here once Product hands development to Tech."
              : "CST starts projects when a new client signs."}
        </EmptyState>
      )}
    </>
  );
}
