"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq, ilike, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { logEvent } from "@/lib/events";
import { notifyTeam } from "@/lib/notify";
import { STATUS, type ProjectStatus } from "@/lib/status";
import { canRequestChanges, canRequestExtraRound, extraRoundPending, isTeam } from "@/lib/workflow";
import type { Team } from "@/lib/teams";

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

  redirect(`/projects/${project.id}/requirement`);
}

export async function addComment(projectId: string, formData: FormData) {
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await db.insert(schema.comments).values({ projectId, authorId: user.id, body: body.slice(0, 5000) });
  await db.update(schema.projects).set({ updatedAt: new Date() }).where(eq(schema.projects.id, projectId));
  revalidatePath(`/projects/${projectId}`);
}

export type ActionState = { error?: string } | undefined;

type Project = typeof schema.projects.$inferSelect;

const text = (fd: FormData, key: string, max = 4000) => String(fd.get(key) ?? "").trim().slice(0, max);

/** Moves a project to a new status, records it on the timeline and emails the receiving team. */
async function move(
  p: Project,
  actorId: string,
  to: ProjectStatus,
  message: string,
  extra: { patch?: Partial<typeof schema.projects.$inferInsert>; data?: Record<string, unknown>; note?: string; type?: string } = {},
) {
  const team = STATUS[to].team;
  await db
    .update(schema.projects)
    .set({ status: to, holdingTeam: team, updatedAt: new Date(), ...extra.patch })
    .where(eq(schema.projects.id, p.id));
  await logEvent({
    projectId: p.id,
    actorId,
    type: extra.type ?? "handoff",
    message,
    fromStatus: p.status,
    toStatus: to,
    data: { ...(extra.data ?? {}), ...(extra.note ? { note: extra.note } : {}) },
  });
  if (extra.note) await db.insert(schema.comments).values({ projectId: p.id, authorId: actorId, body: extra.note });
  if (team !== STATUS[p.status].team || to === "cst_review") {
    const projectId = p.id;
    after(() => notifyTeam(projectId, team, message, p.productOwnerId));
  }
}

/** Every lifecycle button on the project page posts here with an action name. */
export async function advance(projectId: string, action: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const [p] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
  if (!p) return { error: "This project no longer exists." };
  const deny = (team: Team | Team[]) => !isTeam(user, ...(Array.isArray(team) ? team : [team]));
  const wrongState = (...ok: ProjectStatus[]) => !ok.includes(p.status);
  const stale = { error: "Someone else just moved this project. Refresh to see where it is now." };

  switch (action) {
    case "submit": {
      if (deny("cst")) return { error: "Only CST can submit the requirement." };
      if (wrongState("draft")) return stale;
      const [{ pages, items }] = await db.execute<{ pages: number; items: number }>(sql`
        select (select count(*) from project_pages where project_id = ${projectId})::int as pages,
               (select count(*) from project_items where project_id = ${projectId})::int as items`);
      if (!pages || !items) return { error: "Add at least one page and one KPI or chart before submitting." };
      await move(p, user.id, "product_assigned", "Submitted the requirement to Product", { note: text(formData, "note") || undefined });
      break;
    }
    case "assign_owner": {
      if (deny("product")) return { error: "Only Product can assign an owner." };
      const ownerId = text(formData, "ownerId", 40);
      const [owner] = ownerId
        ? await db.select().from(schema.users).where(and(eq(schema.users.id, ownerId), eq(schema.users.active, true))).limit(1)
        : [];
      if (!owner) return { error: "Pick a product owner." };
      const label = owner.name ?? owner.email;
      if (p.status === "product_assigned") {
        await move(p, user.id, "estimating", `Made ${label} the product owner`, { patch: { productOwnerId: owner.id } });
      } else {
        if (wrongState("estimating", "configuring", "in_development", "product_qa", "cst_review", "changes_requested", "on_hold")) return stale;
        await db.update(schema.projects).set({ productOwnerId: owner.id, updatedAt: new Date() }).where(eq(schema.projects.id, p.id));
        await logEvent({ projectId: p.id, actorId: user.id, type: "owner", message: `Changed the product owner to ${label}` });
      }
      break;
    }
    case "plan": {
      if (deny("product")) return { error: "Only Product can set the estimate and deadline." };
      if (wrongState("estimating", "configuring", "in_development", "product_qa", "cst_review", "changes_requested", "on_hold")) return stale;
      const days = Number(text(formData, "manDays", 10));
      const target = text(formData, "targetDate", 10);
      if (!Number.isFinite(days) || days <= 0 || days > 9999) return { error: "Enter the estimate in man-days, for example 4 or 2.5." };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) return { error: "Pick a target date." };
      const changes: string[] = [];
      if (Number(p.estimateManDays) !== days) changes.push(`estimate ${days} man-days`);
      if (p.targetDate !== target) changes.push(`target date ${target}`);
      const patch = { estimateManDays: String(days), targetDate: target };
      if (p.status === "estimating" && formData.get("start") === "1") {
        await move(p, user.id, "configuring", `Set ${changes.join(" and ") || "the plan"} and started configuring`, { patch });
      } else if (changes.length) {
        await db.update(schema.projects).set({ ...patch, updatedAt: new Date() }).where(eq(schema.projects.id, p.id));
        await logEvent({ projectId: p.id, actorId: user.id, type: "plan", message: `Changed the ${changes.join(" and ")}`, data: { reason: text(formData, "reason") } });
        const reason = text(formData, "reason");
        if (reason) await db.insert(schema.comments).values({ projectId: p.id, authorId: user.id, body: reason });
      }
      break;
    }
    case "to_tech": {
      if (deny("product")) return { error: "Only Product can hand work to Tech." };
      if (wrongState("configuring", "changes_requested", "product_qa")) return stale;
      const note = text(formData, "note");
      if (!note) return { error: "Tell Tech what to build." };
      await move(p, user.id, "in_development", p.status === "product_qa" ? "Sent it back to Tech" : "Handed development to Tech", { note });
      break;
    }
    case "to_qa": {
      if (deny("product")) return { error: "Only Product can move this to QA." };
      if (wrongState("configuring", "changes_requested")) return stale;
      await move(p, user.id, "product_qa", "Finished configuring and started QA", { note: text(formData, "note") || undefined });
      break;
    }
    case "deployed": {
      if (deny("tech")) return { error: "Only Tech can mark a deployment." };
      if (wrongState("in_development")) return stale;
      const env = text(formData, "environment", 10);
      if (env !== "beta" && env !== "prod") return { error: "Pick beta or prod." };
      await move(p, user.id, "product_qa", `Deployed to ${env === "prod" ? "prod" : "beta"} and handed back to Product`, {
        type: "deployed",
        data: { environment: env },
        note: text(formData, "note") || undefined,
      });
      break;
    }
    case "to_review": {
      if (deny("product")) return { error: "Only Product can send this for CST review." };
      if (wrongState("product_qa")) return stale;
      const round = p.reviewRound + 1;
      await move(p, user.id, "cst_review", `Sent it to CST for review round ${round}`, {
        patch: { reviewRound: round },
        note: text(formData, "note") || undefined,
      });
      break;
    }
    case "approve": {
      if (deny("cst")) return { error: "Only CST can sign off." };
      if (wrongState("cst_review")) return stale;
      await move(p, user.id, "live", "Approved the delivery. The client is live", { type: "live", note: text(formData, "note") || undefined });
      break;
    }
    case "request_changes": {
      if (deny("cst")) return { error: "Only CST can request changes." };
      if (!canRequestChanges(p)) return { error: "No review rounds left. Request a third round from Product first." };
      const note = text(formData, "note");
      if (!note) return { error: "List what needs to change." };
      await move(p, user.id, "changes_requested", `Requested changes in review round ${p.reviewRound}`, { note });
      break;
    }
    case "request_extra_round": {
      if (deny("cst")) return { error: "Only CST can ask for another round." };
      if (!canRequestExtraRound(p)) return stale;
      const note = text(formData, "note");
      if (!note) return { error: "Say why a third round is needed." };
      await db.update(schema.projects).set({ extraRoundRequested: true, updatedAt: new Date() }).where(eq(schema.projects.id, p.id));
      await logEvent({ projectId: p.id, actorId: user.id, type: "extra_round", message: "Asked Product to approve a third review round" });
      await db.insert(schema.comments).values({ projectId: p.id, authorId: user.id, body: note });
      after(() => notifyTeam(projectId, "product", "CST asked for a third review round", p.productOwnerId));
      break;
    }
    case "approve_extra_round":
    case "decline_extra_round": {
      if (deny("product")) return { error: "Only Product can decide on a third round." };
      if (!extraRoundPending(p)) return stale;
      const approve = action === "approve_extra_round";
      await db
        .update(schema.projects)
        .set(approve ? { extraRoundApprovedBy: user.id, updatedAt: new Date() } : { extraRoundRequested: false, updatedAt: new Date() })
        .where(eq(schema.projects.id, p.id));
      await logEvent({
        projectId: p.id,
        actorId: user.id,
        type: "extra_round",
        message: approve ? "Approved a third review round" : "Declined a third review round",
      });
      const note = text(formData, "note");
      if (note) await db.insert(schema.comments).values({ projectId: p.id, authorId: user.id, body: note });
      after(() => notifyTeam(projectId, "cst", approve ? "Product approved a third review round" : "Product declined a third review round", null));
      break;
    }
    case "hold": {
      if (deny("product")) return { error: "Only Product can pause a project." };
      if (["live", "cancelled", "on_hold", "draft"].includes(p.status)) return stale;
      await move(p, user.id, "on_hold", "Put the project on hold", { type: "hold", data: { resumeTo: p.status }, note: text(formData, "note") || undefined });
      break;
    }
    case "resume": {
      if (deny("product")) return { error: "Only Product can resume a project." };
      if (wrongState("on_hold")) return stale;
      const [held] = await db
        .select({ data: schema.events.data })
        .from(schema.events)
        .where(and(eq(schema.events.projectId, p.id), eq(schema.events.type, "hold")))
        .orderBy(desc(schema.events.createdAt))
        .limit(1);
      const to = ((held?.data as { resumeTo?: ProjectStatus })?.resumeTo ?? "configuring") as ProjectStatus;
      await move(p, user.id, to, `Resumed the project at ${STATUS[to].label}`, { type: "resume" });
      break;
    }
    case "cancel": {
      if (!user.isAdmin && deny("product")) return { error: "Only Product or an admin can cancel a project." };
      if (["live", "cancelled"].includes(p.status)) return stale;
      const note = text(formData, "note");
      if (!note) return { error: "Say why it's being cancelled." };
      await move(p, user.id, "cancelled", "Cancelled the project", { type: "cancel", note });
      break;
    }
    default:
      return { error: "Unknown action." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return undefined;
}

export async function addLink(projectId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const kind = text(formData, "kind", 10) as "ado" | "file" | "url";
  const url = text(formData, "url", 2000);
  const label = text(formData, "label", 200);
  if (!["ado", "file", "url"].includes(kind)) return { error: "Pick a link type." };
  if (!/^https?:\/\/\S+$/i.test(url)) return { error: "Paste a full link starting with https://" };
  await db.insert(schema.links).values({
    projectId,
    kind,
    url,
    label: label || (kind === "ado" ? "Azure DevOps PBI" : new URL(url).hostname),
    addedBy: user.id,
  });
  await logEvent({ projectId, actorId: user.id, type: "link", message: `Attached ${kind === "ado" ? "an Azure DevOps PBI" : kind === "file" ? "a file" : "a link"}: ${label || url}` });
  revalidatePath(`/projects/${projectId}`);
  return undefined;
}

export async function removeLink(projectId: string, linkId: string) {
  const user = await requireUser();
  const [link] = await db.select().from(schema.links).where(and(eq(schema.links.id, linkId), eq(schema.links.projectId, projectId))).limit(1);
  if (!link || (link.addedBy !== user.id && !user.isAdmin)) return;
  await db.delete(schema.links).where(eq(schema.links.id, linkId));
  revalidatePath(`/projects/${projectId}`);
}
