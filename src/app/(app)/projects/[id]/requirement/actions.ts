"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { logEvent } from "@/lib/events";
import { canEditRequirement } from "@/lib/workflow";
import {
  ADDONS,
  CHART_TYPES,
  LOGO_MAX_BYTES,
  WIDTHS,
  isChartKind,
  type Branding,
  type ItemInput,
  type PageInput,
} from "@/lib/requirement";

export type SaveResult = { ok?: boolean; error?: string; id?: string };

const clean = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);

async function editable(projectId: string) {
  const user = await requireUser();
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
  if (!project) return { error: "This project no longer exists." } as const;
  if (!canEditRequirement(user, project)) return { error: "You can't change this requirement right now." } as const;
  return { user, project } as const;
}

/** After hand-off, requirement edits show on the timeline so Product and Tech notice them. */
async function touch(projectId: string, userId: string, status: string, what: string) {
  await db.update(schema.projects).set({ updatedAt: new Date() }).where(eq(schema.projects.id, projectId));
  if (status !== "draft") {
    await logEvent({ projectId, actorId: userId, type: "requirement", message: `Updated the requirement: ${what}` });
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/requirement`);
}

export async function savePages(projectId: string, pages: PageInput[]): Promise<SaveResult> {
  const ctx = await editable(projectId);
  if ("error" in ctx) return { error: ctx.error };
  const valid = await db.select({ key: schema.catalogPages.key }).from(schema.catalogPages);
  const known = new Set(valid.map((v) => v.key));
  const rows = pages
    .filter((p) => known.has(p.pageKey) || p.pageKey.startsWith("custom-"))
    .slice(0, 40)
    .map((p, i) => ({
      projectId,
      pageKey: clean(p.pageKey, 80),
      name: clean(p.name, 120) || "Untitled page",
      tabs: [...new Set(p.tabs.map((t) => clean(t, 60)).filter(Boolean))].slice(0, 12),
      notes: clean(p.notes) || null,
      displayOrder: i,
    }));

  await db.transaction(async (tx) => {
    await tx.delete(schema.projectPages).where(eq(schema.projectPages.projectId, projectId));
    if (rows.length) await tx.insert(schema.projectPages).values(rows);
  });
  await touch(projectId, ctx.user.id, ctx.project.status, "pages and tabs");
  return { ok: true };
}

export async function saveItem(projectId: string, input: ItemInput): Promise<SaveResult> {
  const ctx = await editable(projectId);
  if ("error" in ctx) return { error: ctx.error };
  const title = clean(input.title, 160);
  if (!title) return { error: "Give it a title." };
  if (!["kpi", "chart", "dynamic_chart", "composite_chart"].includes(input.kind)) return { error: "Pick KPI or chart." };
  const chart = isChartKind(input.kind);
  const values = {
    projectId,
    kind: input.kind,
    catalogId: input.catalogId || null,
    isCustom: !input.catalogId,
    title,
    description: clean(input.description) || null,
    formula: clean(input.formula) || null,
    logic: clean(input.logic, 4000) || null,
    pageKey: clean(input.pageKey, 80) || null,
    tab: clean(input.tab, 60) || null,
    chartType: chart && (CHART_TYPES as readonly string[]).includes(input.chartType) ? input.chartType : null,
    settings: {
      width: WIDTHS.some((w) => w.id === input.width) ? input.width : "third",
      colors: (input.colors ?? []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 6),
      configurationId: input.configurationId ? clean(input.configurationId, 200) : null,
    },
  };

  let id = input.id;
  if (id) {
    const [updated] = await db
      .update(schema.projectItems)
      .set(values)
      .where(and(eq(schema.projectItems.id, id), eq(schema.projectItems.projectId, projectId)))
      .returning({ id: schema.projectItems.id });
    if (!updated) return { error: "That item was removed. Add it again." };
  } else {
    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(max(${schema.projectItems.displayOrder}), -1)::int + 1` })
      .from(schema.projectItems)
      .where(eq(schema.projectItems.projectId, projectId));
    const [created] = await db
      .insert(schema.projectItems)
      .values({ ...values, displayOrder: next })
      .returning({ id: schema.projectItems.id });
    id = created.id;
  }
  await touch(projectId, ctx.user.id, ctx.project.status, `${input.id ? "edited" : "added"} ${title}`);
  return { ok: true, id };
}

export async function deleteItem(projectId: string, itemId: string): Promise<SaveResult> {
  const ctx = await editable(projectId);
  if ("error" in ctx) return { error: ctx.error };
  const [gone] = await db
    .delete(schema.projectItems)
    .where(and(eq(schema.projectItems.id, itemId), eq(schema.projectItems.projectId, projectId)))
    .returning({ title: schema.projectItems.title });
  if (gone) await touch(projectId, ctx.user.id, ctx.project.status, `removed ${gone.title}`);
  return { ok: true };
}

export async function saveBranding(projectId: string, branding: Branding): Promise<SaveResult> {
  const ctx = await editable(projectId);
  if ("error" in ctx) return { error: ctx.error };
  const logo = branding.logo ?? "";
  if (logo && !/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(logo)) return { error: "Use a PNG, JPG, WebP or SVG logo." };
  if (logo.length > Math.ceil((LOGO_MAX_BYTES * 4) / 3) + 100) return { error: "The logo must be 300 KB or smaller." };
  const hex = (c?: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : undefined);
  const value: Branding = {
    displayName: clean(branding.displayName, 120) || undefined,
    logo: logo || undefined,
    primaryColor: hex(branding.primaryColor),
    secondaryColor: hex(branding.secondaryColor),
  };
  await db
    .insert(schema.projectSettings)
    .values({ projectId, branding: value })
    .onConflictDoUpdate({ target: schema.projectSettings.projectId, set: { branding: value } });
  await touch(projectId, ctx.user.id, ctx.project.status, "branding");
  return { ok: true };
}

export async function saveAddons(
  projectId: string,
  addons: Record<string, boolean>,
  notes: Record<string, string>,
): Promise<SaveResult> {
  const ctx = await editable(projectId);
  if ("error" in ctx) return { error: ctx.error };
  const on: Record<string, boolean> = {};
  const addonNotes: Record<string, string> = {};
  for (const a of ADDONS) {
    on[a.id] = !!addons[a.id];
    if (notes[a.id]) addonNotes[a.id] = clean(notes[a.id]);
  }
  const [current] = await db
    .select({ extra: schema.projectSettings.extra })
    .from(schema.projectSettings)
    .where(eq(schema.projectSettings.projectId, projectId));
  const extra = { ...(current?.extra ?? {}), addonNotes };
  await db
    .insert(schema.projectSettings)
    .values({ projectId, addons: on, extra })
    .onConflictDoUpdate({ target: schema.projectSettings.projectId, set: { addons: on, extra } });
  await touch(projectId, ctx.user.id, ctx.project.status, "add-ons");
  return { ok: true };
}

export type CatalogHit = {
  id: string;
  kind: "kpi" | "chart" | "dynamic_chart" | "composite_chart";
  configurationId: string;
  title: string | null;
  description: string | null;
  chartType: string | null;
};

/** Searches the Pulse KPI and chart catalog by title, description or configuration id. */
export async function searchCatalog(query: string, group: "kpi" | "chart"): Promise<CatalogHit[]> {
  await requireUser();
  const q = query.trim().slice(0, 80);
  const kinds = group === "kpi" ? (["kpi"] as const) : (["chart", "dynamic_chart", "composite_chart"] as const);
  return db
    .select({
      id: schema.catalogItems.id,
      kind: schema.catalogItems.kind,
      configurationId: schema.catalogItems.configurationId,
      title: schema.catalogItems.title,
      description: schema.catalogItems.description,
      chartType: schema.catalogItems.chartType,
    })
    .from(schema.catalogItems)
    .where(
      and(
        eq(schema.catalogItems.active, true),
        inArray(schema.catalogItems.kind, [...kinds]),
        q
          ? or(
              ilike(schema.catalogItems.title, `%${q}%`),
              ilike(schema.catalogItems.description, `%${q}%`),
              ilike(schema.catalogItems.configurationId, `%${q}%`),
            )
          : undefined,
      ),
    )
    // Title matches first, then description or id matches
    .orderBy(
      q
        ? sql`case when ${schema.catalogItems.title} ilike ${`${q}%`} then 0 when ${schema.catalogItems.title} ilike ${`%${q}%`} then 1 else 2 end`
        : asc(schema.catalogItems.title),
      asc(schema.catalogItems.title),
    )
    .limit(25);
}
