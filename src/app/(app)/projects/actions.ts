"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { logEvent } from "@/lib/events";

const newProjectSchema = z.object({
  clientId: z.string().uuid().optional(),
  newClientName: z.string().trim().max(200).optional(),
  newCompanyId: z.string().trim().regex(/^\d*$/, "Company ID must be a number").optional(),
  productType: z.enum(["web", "app", "both"]),
});

export type FormState = { error?: string } | undefined;

export async function createProject(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.team !== "cst" && !user.isAdmin) return { error: "Only CST can start a client project." };

  const parsed = newProjectSchema.safeParse({
    clientId: formData.get("clientId") || undefined,
    newClientName: formData.get("newClientName") || undefined,
    newCompanyId: formData.get("newCompanyId") || undefined,
    productType: formData.get("productType"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const input = parsed.data;

  let clientId = input.clientId;
  let clientName = "";

  if (!clientId) {
    if (!input.newClientName) return { error: "Pick a client from the list or add a new one." };
    const companyId = input.newCompanyId ? Number(input.newCompanyId) : null;
    if (companyId) {
      const [taken] = await db.select().from(schema.clients).where(eq(schema.clients.companyId, companyId)).limit(1);
      if (taken) return { error: `Company ID ${companyId} already belongs to ${taken.name}. Pick it from the list instead.` };
    } else {
      const [same] = await db
        .select()
        .from(schema.clients)
        .where(and(ilike(schema.clients.name, input.newClientName)))
        .limit(1);
      if (same) return { error: `${same.name} already exists. Pick it from the list instead.` };
    }
    const [created] = await db
      .insert(schema.clients)
      .values({ name: input.newClientName, companyId, source: "manual", createdBy: user.id })
      .returning();
    clientId = created.id;
    clientName = created.name;
  } else {
    const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, clientId)).limit(1);
    if (!c) return { error: "That client no longer exists." };
    clientName = c.name;
  }

  const [project] = await db
    .insert(schema.projects)
    .values({
      clientId,
      title: `${clientName} Pulse onboarding`,
      productType: input.productType,
      status: "draft",
      holdingTeam: "cst",
      createdBy: user.id,
    })
    .returning();
  await db.insert(schema.projectSettings).values({ projectId: project.id });
  await logEvent({
    projectId: project.id,
    actorId: user.id,
    type: "created",
    message: `Created the project for ${clientName}`,
    toStatus: "draft",
  });

  redirect(`/projects/${project.id}`);
}

export async function assignToProduct(projectId: string) {
  const user = await requireUser();
  const [p] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
  if (!p || p.status !== "draft") return;
  if (user.team !== "cst" && !user.isAdmin) return;
  await db
    .update(schema.projects)
    .set({ status: "product_assigned", holdingTeam: "product", updatedAt: new Date() })
    .where(eq(schema.projects.id, projectId));
  await logEvent({
    projectId,
    actorId: user.id,
    type: "handoff",
    message: "Assigned to the Product team",
    fromStatus: "draft",
    toStatus: "product_assigned",
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function addComment(projectId: string, formData: FormData) {
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await db.insert(schema.comments).values({ projectId, authorId: user.id, body: body.slice(0, 5000) });
  await db.update(schema.projects).set({ updatedAt: new Date() }).where(eq(schema.projects.id, projectId));
  revalidatePath(`/projects/${projectId}`);
}
