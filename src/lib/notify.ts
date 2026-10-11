import "server-only";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendMail, isMailConfigured } from "./mailer";
import type { Team } from "./teams";

const appUrl = () =>
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/** Emails the team that now holds a project (and its product owner). Never throws: a nudge must not break a hand-off. */
export async function notifyTeam(projectId: string, team: Team, what: string, ownerId: string | null) {
  if (!isMailConfigured) return;
  try {
    const [row] = await db
      .select({ client: schema.clients.name })
      .from(schema.projects)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
      .where(eq(schema.projects.id, projectId));
    const people = await db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.active, true),
          isNotNull(schema.users.passwordHash),
          ownerId ? or(eq(schema.users.team, team), eq(schema.users.id, ownerId)) : eq(schema.users.team, team),
        ),
      );
    if (!row || people.length === 0) return;
    const link = `${appUrl()}/projects/${projectId}`;
    await sendMail({
      to: people.map((p) => p.email).join(","),
      subject: `${row.client}: ${what}`,
      text: `${what}.\n\nOpen the project: ${link}`,
      html: `<div style="font-family:Arial,sans-serif;color:#0f1b33;max-width:520px">
        <p style="font-size:15px"><strong>${row.client}</strong>: ${what}.</p>
        <p><a href="${link}" style="display:inline-block;background:#1e56d9;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Open the project</a></p>
      </div>`,
    });
  } catch (e) {
    console.error("Team notification failed", e);
  }
}
