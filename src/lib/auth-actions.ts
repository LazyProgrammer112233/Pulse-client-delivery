"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { endAllSessions, endCurrentSession, recentFailures, recordAuthEvent, startSession } from "./auth";
import { isSeedAdmin, isValidEmail, normalizeEmail } from "./domain";
import { hashPassword, passwordProblem, verifyPassword } from "./password";
import { issueCode, verifyCode } from "./otp";
import { TEAMS, type Team } from "./teams";

export type AuthFormState = { error?: string; email?: string; name?: string; team?: string; step?: string } | undefined;

const MAX_FAILURES = 8;

/** Only same-site paths are allowed as a post-login destination. */
function safeNext(next: unknown) {
  const n = String(next ?? "");
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

async function findUser(email: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  return user ?? null;
}

export async function login(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!isValidEmail(email)) return { error: "Enter a valid email address.", email };
  if (!password) return { error: "Enter your password.", email };

  if ((await recentFailures(email)) >= MAX_FAILURES) {
    return { error: "Too many wrong passwords. Wait 15 minutes, or reset your password.", email };
  }

  const user = await findUser(email);
  if (!user || !user.passwordHash) {
    return { error: "There's no account for this email yet. Create one with Sign up.", email, step: "no_account" };
  }
  if (!user.active) return { error: "Your access has been removed. Ask an admin to restore it.", email };
  if (!(await verifyPassword(password, user.passwordHash))) {
    await recordAuthEvent("login_failed", email, user.id);
    return { error: "That password is wrong. Try again or reset it.", email };
  }

  await startSession(user.id);
  await recordAuthEvent("login", email, user.id);
  redirect(user.team ? safeNext(formData.get("next")) : "/onboarding");
}

export async function signup(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const team = String(formData.get("team") ?? "") as Team;
  const keep = { name, email, team };

  if (!name) return { error: "Enter your name.", ...keep };
  if (!isValidEmail(email)) return { error: "Enter a valid email address.", ...keep };
  if (!TEAMS.some((t) => t.id === team)) return { error: "Pick your team.", ...keep };
  const problem = passwordProblem(password);
  if (problem) return { error: problem, ...keep };

  const existing = await findUser(email);
  if (existing?.passwordHash) {
    return { error: "This email is already registered. Log in instead.", ...keep, step: "registered" };
  }
  if (existing && !existing.active) return { error: "Your access has been removed. Ask an admin to restore it.", ...keep };

  const now = new Date();
  const passwordHash = await hashPassword(password);
  let userId: string;
  if (existing) {
    // An account an admin added, or one from before passwords: registering claims it
    await db
      .update(schema.users)
      .set({
        name,
        passwordHash,
        passwordUpdatedAt: now,
        registeredAt: now,
        team: existing.team ?? team,
        isAdmin: existing.isAdmin || isSeedAdmin(email),
      })
      .where(eq(schema.users.id, existing.id));
    userId = existing.id;
  } else {
    const [created] = await db
      .insert(schema.users)
      .values({ email, name, team, passwordHash, passwordUpdatedAt: now, registeredAt: now, isAdmin: isSeedAdmin(email) })
      .returning({ id: schema.users.id });
    userId = created.id;
  }

  await recordAuthEvent("signup", email, userId);
  await startSession(userId);
  redirect("/dashboard");
}

export async function logout() {
  await endCurrentSession();
  redirect("/login?signed_out=1");
}

export async function requestReset(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  if (!isValidEmail(email)) return { error: "Enter a valid email address.", email };
  const user = await findUser(email);
  if (!user?.passwordHash) return { error: "There's no account for this email yet. Create one with Sign up.", email };
  try {
    const result = await issueCode(email);
    if (result.error) return { error: result.error, email };
  } catch (e) {
    console.error("Sending password reset code failed", e);
    return {
      error: "We couldn't send the email. Ask an admin to reset your password from Users and roles.",
      email,
    };
  }
  await recordAuthEvent("password_reset_requested", email, user.id);
  return { email, step: "code" };
}

export async function resetPassword(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const password = String(formData.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem, email, step: "code" };
  const user = await findUser(email);
  if (!user || !(await verifyCode(email, code))) {
    return { error: "That code is wrong or has expired. Check the latest email.", email, step: "code" };
  }
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password), passwordUpdatedAt: new Date() })
    .where(eq(schema.users.id, user.id));
  await endAllSessions(user.id, "password_reset");
  await recordAuthEvent("password_reset", email, user.id);
  await startSession(user.id);
  redirect("/dashboard");
}
