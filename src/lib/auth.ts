import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export const SESSION_COOKIE = "pd_session";
const SESSION_DAYS = 30;
// lastSeenAt is refreshed at most this often, so normal browsing costs no extra writes
const TOUCH_EVERY_MS = 5 * 60_000;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

async function clientInfo() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

export async function recordAuthEvent(type: string, email: string, userId: string | null) {
  const { ip, userAgent } = await clientInfo();
  await db.insert(schema.authEvents).values({ type, email, userId, ip, userAgent });
}

/** Starts a session for the user and sets the cookie. */
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const { ip, userAgent } = await clientInfo();
  await db.insert(schema.userSessions).values({ userId, tokenHash: sha256(token), expiresAt, ip, userAgent });
  await db.update(schema.users).set({ lastLoginAt: new Date(), lastSeenAt: new Date() }).where(eq(schema.users.id, userId));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The current session and its user, or null. Cached per request. */
export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ session: schema.userSessions, user: schema.users })
    .from(schema.userSessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.userSessions.userId))
    .where(
      and(
        eq(schema.userSessions.tokenHash, sha256(token)),
        isNull(schema.userSessions.endedAt),
        gt(schema.userSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row || !row.user.active) return null;

  if (Date.now() - row.session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    after(async () => {
      const now = new Date();
      await db.update(schema.userSessions).set({ lastSeenAt: now }).where(eq(schema.userSessions.id, row.session.id));
      await db.update(schema.users).set({ lastSeenAt: now }).where(eq(schema.users.id, row.user.id));
    });
  }
  return row;
});

/** Ends this browser's session (logout) and clears the cookie. */
export async function endCurrentSession() {
  const session = await getSession();
  const jar = await cookies();
  if (session) {
    const now = new Date();
    await db
      .update(schema.userSessions)
      .set({ endedAt: now, endReason: "logout" })
      .where(eq(schema.userSessions.id, session.session.id));
    await db.update(schema.users).set({ lastLogoutAt: now }).where(eq(schema.users.id, session.user.id));
    await recordAuthEvent("logout", session.user.email, session.user.id);
  }
  jar.delete(SESSION_COOKIE);
}

/** Signs the user out everywhere, for a password change or when an admin removes access. */
export async function endAllSessions(userId: string, reason: string) {
  await db
    .update(schema.userSessions)
    .set({ endedAt: new Date(), endReason: reason })
    .where(and(eq(schema.userSessions.userId, userId), isNull(schema.userSessions.endedAt)));
}

/** Failed logins for this email in the last 15 minutes. */
export async function recentFailures(email: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.authEvents)
    .where(
      and(
        eq(schema.authEvents.email, email),
        eq(schema.authEvents.type, "login_failed"),
        gt(schema.authEvents.createdAt, sql`now() - interval '15 minutes'`),
      ),
    );
  return n;
}
