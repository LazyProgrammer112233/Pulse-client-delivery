"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { isWorkEmail } from "@/lib/domain";
import type { Team } from "@/lib/teams";

export type AdminState = { error?: string; ok?: string } | undefined;

const TEAM_IDS: Team[] = ["cst", "product", "tech"];

export async function addUser(_: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const team = String(formData.get("team") ?? "") as Team;
  const isAdmin = formData.get("isAdmin") === "on";
  if (!isWorkEmail(email)) return { error: "Use a @fieldassist.com work email." };
  if (!TEAM_IDS.includes(team)) return { error: "Pick a team." };
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing) return { error: `${email} already has access.` };
  await db.insert(schema.users).values({ email, name, team, isAdmin });
  revalidatePath("/admin/users");
  return { ok: `Added ${email}. They can sign in now.` };
}

export async function updateUser(userId: string, formData: FormData) {
  const me = await requireAdmin();
  const team = String(formData.get("team") ?? "") as Team;
  const patch: Partial<typeof schema.users.$inferInsert> = {};
  if (TEAM_IDS.includes(team)) patch.team = team;
  if (formData.has("isAdmin")) {
    const wantAdmin = formData.get("isAdmin") === "true";
    // Never let the last admin remove their own admin rights
    if (!wantAdmin && userId === me.id) return;
    patch.isAdmin = wantAdmin;
  }
  if (formData.has("active")) {
    const wantActive = formData.get("active") === "true";
    if (!wantActive && userId === me.id) return;
    patch.active = wantActive;
  }
  if (Object.keys(patch).length) await db.update(schema.users).set(patch).where(eq(schema.users.id, userId));
  revalidatePath("/admin/users");
}

export async function removeUser(userId: string) {
  const me = await requireAdmin();
  if (userId === me.id) return;
  // Users who created or own projects are kept for history and deactivated instead
  const [hasHistory] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.createdBy, userId))
    .limit(1);
  const [ownsSomething] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.productOwnerId, userId))
    .limit(1);
  const [commented] = await db
    .select({ id: schema.comments.id })
    .from(schema.comments)
    .where(eq(schema.comments.authorId, userId))
    .limit(1);
  if (hasHistory || ownsSomething || commented) {
    await db.update(schema.users).set({ active: false, isAdmin: false }).where(eq(schema.users.id, userId));
  } else {
    await db.delete(schema.users).where(and(eq(schema.users.id, userId), ne(schema.users.id, me.id)));
  }
  revalidatePath("/admin/users");
}
