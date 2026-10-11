import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { isWorkEmail } from "./domain";

export type CurrentUser = typeof schema.users.$inferSelect;

/** The signed-in user's row, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !isWorkEmail(email)) return null;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user || !user.active) return null;
  return user;
});

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
