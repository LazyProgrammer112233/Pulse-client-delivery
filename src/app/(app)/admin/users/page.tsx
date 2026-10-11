import { asc, desc, eq, sql } from "drizzle-orm";
import { ShieldCheck, ShieldOff, Trash2, UserX, UserCheck, KeyRound, LogOut, Activity } from "lucide-react";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { updateUser, removeUser, resetUserPassword, signOutEverywhere } from "./actions";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddUserForm } from "@/components/admin/add-user-form";
import { TeamSelect } from "@/components/admin/team-select";
import { ConfirmButton } from "@/components/ui/confirm-button";

const EVENT_LABEL: Record<string, string> = {
  signup: "Registered",
  login: "Logged in",
  logout: "Logged out",
  login_failed: "Wrong password",
  password_reset_requested: "Asked for a reset code",
  password_reset: "Reset their password",
  password_reset_by_admin: "Password cleared by an admin",
};

const ONLINE_WINDOW = sql`now() - interval '15 minutes'`;

export default async function UsersPage() {
  const me = await requireAdmin();
  const [users, live, activity] = await Promise.all([
    db.select().from(schema.users).orderBy(asc(schema.users.email)),
    db
      .select({
        userId: schema.userSessions.userId,
        open: sql<number>`count(*)::int`,
        online: sql<number>`count(*) filter (where ${schema.userSessions.lastSeenAt} > ${ONLINE_WINDOW})::int`,
      })
      .from(schema.userSessions)
      .where(sql`${schema.userSessions.endedAt} is null and ${schema.userSessions.expiresAt} > now()`)
      .groupBy(schema.userSessions.userId),
    db
      .select({ event: schema.authEvents, name: schema.users.name })
      .from(schema.authEvents)
      .leftJoin(schema.users, eq(schema.users.id, schema.authEvents.userId))
      .orderBy(desc(schema.authEvents.createdAt))
      .limit(40),
  ]);
  const sessions = new Map(live.map((l) => [l.userId, l]));

  // Speed check: one round trip to the database from wherever this page is running
  const t0 = performance.now();
  await db.execute(sql`select 1`);
  const dbMs = Math.round(performance.now() - t0);
  const dbHost = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").match(/@([^/:]+)/)?.[1] ?? "";
  const dbRegion = dbHost.match(/\.([a-z]{2}-[a-z]+-\d)\./)?.[1] ?? "unknown";
  const appRegion = process.env.VERCEL_REGION ?? "local";
  const registered = users.filter((u) => u.passwordHash).length;

  return (
    <>
      <PageHeader
        title="Users and roles"
        description={`${registered} registered of ${users.length} people. Set teams, make admins, reset passwords or remove access.`}
      />
      <AddUserForm />
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-line bg-brand-50/40 text-xs font-medium uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Right now</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3">Last logout</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => {
              const self = u.id === me.id;
              const s = sessions.get(u.id);
              return (
                <tr key={u.id} className={u.active ? "" : "bg-slate-50/70 text-muted"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} email={u.email} />
                      <div>
                        <p className="font-medium text-ink">
                          {u.name ?? u.email.split("@")[0]} {self && <span className="text-xs text-muted">(you)</span>}
                        </p>
                        <p className="text-xs text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TeamSelect userId={u.id} team={u.team} action={updateUser.bind(null, u.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {!u.active ? (
                        <Badge tone="red">No access</Badge>
                      ) : u.passwordHash ? (
                        <Badge tone="green">Registered</Badge>
                      ) : (
                        <Badge tone="amber">Not registered</Badge>
                      )}
                      {u.isAdmin && <Badge>Admin</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s?.online ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700">
                        <span className="size-2 rounded-full bg-emerald-500" /> Online
                      </span>
                    ) : s?.open ? (
                      <span className="text-ink">Signed in</span>
                    ) : (
                      <span className="text-muted">Signed out</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                  <td className="px-4 py-3 text-muted">{u.lastLogoutAt ? formatDateTime(u.lastLogoutAt) : "Never"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {!self && (
                        <form action={updateUser.bind(null, u.id)}>
                          <input type="hidden" name="isAdmin" value={u.isAdmin ? "false" : "true"} />
                          <IconButton title={u.isAdmin ? "Remove admin" : "Make admin"}>
                            {u.isAdmin ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                          </IconButton>
                        </form>
                      )}
                      {!self && !!s?.open && (
                        <form action={signOutEverywhere.bind(null, u.id)}>
                          <IconButton title="Sign out of every device">
                            <LogOut className="size-4" />
                          </IconButton>
                        </form>
                      )}
                      {!self && u.passwordHash && (
                        <ConfirmButton
                          action={resetUserPassword.bind(null, u.id)}
                          title="Reset password"
                          message={`Clear ${u.email}'s password and sign them out? They sign up again with the same email to choose a new one.`}
                        >
                          <KeyRound className="size-4" />
                        </ConfirmButton>
                      )}
                      {!self && (
                        <form action={updateUser.bind(null, u.id)}>
                          <input type="hidden" name="active" value={u.active ? "false" : "true"} />
                          <IconButton title={u.active ? "Revoke access" : "Restore access"} danger={u.active}>
                            {u.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                          </IconButton>
                        </form>
                      )}
                      {!self && (
                        <ConfirmButton
                          action={removeUser.bind(null, u.id)}
                          title="Remove user"
                          danger
                          message={`Remove ${u.email}? Anyone with project history is kept on record with no access.`}
                        >
                          <Trash2 className="size-4" />
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Online means active in the last 15 minutes. Removing someone who created, owns or commented on a project revokes
        their access but keeps their name on the history.
      </p>

      <p className="mt-2 text-xs text-muted">
        Speed check: database round trip {dbMs} ms (app region {appRegion}, database region {dbRegion}). Above about 50 ms,
        set Vercel&apos;s Function Region to match the database region.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <div>
            <CardTitle>Sign-in activity</CardTitle>
            <CardDescription>Registrations, logins, logouts and password changes, newest first.</CardDescription>
          </div>
          <Activity className="size-5 text-brand-500" />
        </CardHeader>
        <CardBody>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map(({ event, name }) => (
                <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span>
                    <span className="font-medium text-ink">{name ?? event.email}</span>{" "}
                    <span className={event.type === "login_failed" ? "text-danger-600" : "text-muted"}>
                      {(EVENT_LABEL[event.type] ?? event.type).toLowerCase()}
                    </span>
                  </span>
                  <span className="text-xs text-muted">{formatDateTime(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function IconButton({ title, danger, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      title={title}
      aria-label={title}
      className={
        danger
          ? "rounded-lg p-2 text-danger-600 transition hover:bg-danger-50"
          : "rounded-lg p-2 text-muted transition hover:bg-brand-50 hover:text-brand-700"
      }
    >
      {children}
    </button>
  );
}
