import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listProjects } from "@/lib/queries";
import { STATUS, type ProjectStatus } from "@/lib/status";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ProjectTable } from "@/components/projects/project-table";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const { status } = await searchParams;
  const filter = status && status in STATUS ? (status as ProjectStatus) : undefined;
  const rows = await listProjects(filter ? { statuses: [filter] } : {});
  const canCreate = user.team === "cst" || user.isAdmin;

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every client delivery, newest activity first."
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
        {(Object.keys(STATUS) as ProjectStatus[]).map((s) => (
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
          {canCreate ? "Start one with New client project." : "CST starts projects when a new client signs."}
        </EmptyState>
      )}
    </>
  );
}
