import "server-only";
import { and, asc, desc, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import type { ProjectStatus } from "./status";
import { toItemRow, type Branding } from "./requirement";
import { TECH_HIDDEN, techOnly } from "./workflow";

const owner = alias(schema.users, "owner");
const creator = alias(schema.users, "creator");

export type ProjectRow = Awaited<ReturnType<typeof listProjects>>[number];

/** SQL condition: Product has handed this project to Tech at some point and it's still running. */
const handedToTech = () =>
  and(
    notInArray(schema.projects.status, TECH_HIDDEN),
    or(
      eq(schema.projects.status, "in_development"),
      sql`exists (select 1 from ${schema.events} where ${schema.events.projectId} = ${schema.projects.id} and ${schema.events.toStatus} = 'in_development')`,
    ),
  );

/** Whether a Tech member may open this project. */
export async function techCanSee(projectId: string) {
  const [row] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), handedToTech()))
    .limit(1);
  return !!row;
}

/** Everyone opens every project, except Tech, who only open the ones handed to them. */
export async function canOpenProject(user: { team: "cst" | "product" | "tech" | null; isAdmin: boolean }, projectId: string) {
  return !techOnly(user) || techCanSee(projectId);
}

/** Azure DevOps links for a set of projects, for the Tech dashboard. */
export async function listAdoLinks(projectIds: string[]) {
  if (!projectIds.length) return [];
  return db
    .select({ projectId: schema.links.projectId, url: schema.links.url, label: schema.links.label })
    .from(schema.links)
    .where(and(inArray(schema.links.projectId, projectIds), eq(schema.links.kind, "ado")))
    .orderBy(asc(schema.links.createdAt));
}

export async function listProjects(
  filter: { statuses?: ProjectStatus[]; ownerId?: string; createdBy?: string; forTech?: boolean } = {},
) {
  const where = [];
  if (filter.forTech) where.push(handedToTech());
  if (filter.statuses?.length) where.push(inArray(schema.projects.status, filter.statuses));
  if (filter.ownerId) where.push(eq(schema.projects.productOwnerId, filter.ownerId));
  if (filter.createdBy) where.push(eq(schema.projects.createdBy, filter.createdBy));

  return db
    .select({
      id: schema.projects.id,
      title: schema.projects.title,
      status: schema.projects.status,
      holdingTeam: schema.projects.holdingTeam,
      productType: schema.projects.productType,
      targetDate: schema.projects.targetDate,
      estimateManDays: schema.projects.estimateManDays,
      reviewRound: schema.projects.reviewRound,
      extraRoundRequested: schema.projects.extraRoundRequested,
      extraRoundApprovedBy: schema.projects.extraRoundApprovedBy,
      updatedAt: schema.projects.updatedAt,
      clientName: schema.clients.name,
      companyId: schema.clients.companyId,
      ownerName: owner.name,
      ownerEmail: owner.email,
      creatorName: creator.name,
      creatorEmail: creator.email,
    })
    .from(schema.projects)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .leftJoin(owner, eq(owner.id, schema.projects.productOwnerId))
    .leftJoin(creator, eq(creator.id, schema.projects.createdBy))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.projects.updatedAt));
}

export async function getProject(id: string) {
  const [row] = await db
    .select({
      project: schema.projects,
      client: schema.clients,
      ownerName: owner.name,
      ownerEmail: owner.email,
      creatorName: creator.name,
      creatorEmail: creator.email,
    })
    .from(schema.projects)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .leftJoin(owner, eq(owner.id, schema.projects.productOwnerId))
    .leftJoin(creator, eq(creator.id, schema.projects.createdBy))
    .where(eq(schema.projects.id, id))
    .limit(1);
  return row ?? null;
}

export async function getTimeline(projectId: string) {
  const [events, comments] = await Promise.all([
    db
      .select({ event: schema.events, actorName: schema.users.name, actorEmail: schema.users.email })
      .from(schema.events)
      .leftJoin(schema.users, eq(schema.users.id, schema.events.actorId))
      .where(eq(schema.events.projectId, projectId)),
    db
      .select({ comment: schema.comments, actorName: schema.users.name, actorEmail: schema.users.email })
      .from(schema.comments)
      .innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
      .where(eq(schema.comments.projectId, projectId)),
  ]);

  type Entry = {
    id: string;
    kind: "event" | "comment";
    at: Date;
    actor: string;
    text: string;
    type?: string;
    toStatus?: ProjectStatus | null;
  };
  const entries: Entry[] = [
    ...events.map((e) => ({
      id: e.event.id,
      kind: "event" as const,
      at: e.event.createdAt,
      actor: e.actorName ?? e.actorEmail ?? "System",
      text: e.event.message ?? e.event.type,
      type: e.event.type,
      toStatus: e.event.toStatus,
    })),
    ...comments.map((c) => ({
      id: c.comment.id,
      kind: "comment" as const,
      at: c.comment.createdAt,
      actor: c.actorName ?? c.actorEmail,
      text: c.comment.body,
    })),
  ];
  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export async function searchClients(q: string, limit = 50) {
  const term = q.trim();
  const numeric = /^\d+$/.test(term) ? Number(term) : null;
  return db
    .select()
    .from(schema.clients)
    .where(
      term
        ? or(ilike(schema.clients.name, `%${term}%`), numeric !== null ? eq(schema.clients.companyId, numeric) : undefined)
        : undefined,
    )
    .orderBy(asc(schema.clients.name))
    .limit(limit);
}

export async function countRows() {
  const [r] = await db.execute<{ clients: number; projects: number; catalog: number; users: number }>(sql`
    select
      (select count(*) from clients)::int as clients,
      (select count(*) from projects)::int as projects,
      (select count(*) from catalog_items where active)::int as catalog,
      (select count(*) from users where active)::int as users
  `);
  return r;
}

export async function getRequirement(projectId: string) {
  const [pages, items, [settings]] = await Promise.all([
    db
      .select()
      .from(schema.projectPages)
      .where(eq(schema.projectPages.projectId, projectId))
      .orderBy(asc(schema.projectPages.displayOrder)),
    db
      .select()
      .from(schema.projectItems)
      .where(eq(schema.projectItems.projectId, projectId))
      .orderBy(asc(schema.projectItems.displayOrder)),
    db.select().from(schema.projectSettings).where(eq(schema.projectSettings.projectId, projectId)),
  ]);
  const extra = (settings?.extra ?? {}) as { addonNotes?: Record<string, string> };
  return {
    pages: pages.map((p) => ({ pageKey: p.pageKey, name: p.name, tabs: Array.isArray(p.tabs) ? p.tabs : [], notes: p.notes ?? "" })),
    items: items.map(toItemRow),
    branding: (settings?.branding ?? {}) as Branding,
    addons: settings?.addons ?? {},
    addonNotes: extra.addonNotes ?? {},
  };
}

export type Requirement = Awaited<ReturnType<typeof getRequirement>>;

export async function listCatalogPages() {
  return db.select().from(schema.catalogPages).orderBy(desc(schema.catalogPages.usedBy));
}

export async function listTeamMembers(team: "cst" | "product" | "tech") {
  return db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(and(eq(schema.users.team, team), eq(schema.users.active, true)))
    .orderBy(asc(schema.users.name));
}

export async function listLinks(projectId: string) {
  return db
    .select({ link: schema.links, by: schema.users.name, byEmail: schema.users.email })
    .from(schema.links)
    .innerJoin(schema.users, eq(schema.users.id, schema.links.addedBy))
    .where(eq(schema.links.projectId, projectId))
    .orderBy(desc(schema.links.createdAt));
}
