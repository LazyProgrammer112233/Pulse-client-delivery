import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./auth";
import type { schema } from "@/db";

export type CurrentUser = typeof schema.users.$inferSelect;

/** The signed-in user's row, or null. Cached per request through getSession. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  return (await getSession())?.user ?? null;
}

/** Signed in, active, and has picked a team. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.team) redirect("/onboarding");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}
