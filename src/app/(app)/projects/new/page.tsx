import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { NewProjectForm } from "@/components/projects/new-project-form";

export default async function NewProjectPage() {
  const user = await requireUser();
  if (user.team !== "cst" && !user.isAdmin) redirect("/projects");

  const clients = await db
    .select({ id: schema.clients.id, name: schema.clients.name, companyId: schema.clients.companyId })
    .from(schema.clients)
    .orderBy(asc(schema.clients.name));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New client project"
        description="Start with the client and product. You will add pages, KPIs and charts on the next screen."
      />
      <NewProjectForm clients={clients} />
    </div>
  );
}
