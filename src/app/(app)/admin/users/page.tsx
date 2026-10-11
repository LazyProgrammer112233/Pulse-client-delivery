import { asc } from "drizzle-orm";
import { ShieldCheck, ShieldOff, Trash2, UserX, UserCheck } from "lucide-react";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { updateUser, removeUser } from "./actions";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { AddUserForm } from "@/components/admin/add-user-form";
import { TeamSelect } from "@/components/admin/team-select";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await db.select().from(schema.users).orderBy(asc(schema.users.email));

  return (
    <>
      <PageHeader
        title="Users and roles"
        description="Everyone with a @flick2know.com account can sign in. Set their team, make admins, or remove access."
      />
      <AddUserForm />
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-brand-50/40 text-xs font-medium uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Last sign-in</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => {
              const self = u.id === me.id;
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
                      {u.isAdmin ? <Badge>Admin</Badge> : <Badge tone="gray">Member</Badge>}
                      {!u.active && <Badge tone="red">No access</Badge>}
                      {!u.team && u.active && <Badge tone="amber">Team not picked</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {!self && (
                        <form action={updateUser.bind(null, u.id)}>
                          <input type="hidden" name="isAdmin" value={u.isAdmin ? "false" : "true"} />
                          <button
                            type="submit"
                            title={u.isAdmin ? "Remove admin" : "Make admin"}
                            className="rounded-lg p-2 text-muted transition hover:bg-brand-50 hover:text-brand-700"
                          >
                            {u.isAdmin ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                          </button>
                        </form>
                      )}
                      {!self && (
                        <form action={updateUser.bind(null, u.id)}>
                          <input type="hidden" name="active" value={u.active ? "false" : "true"} />
                          <button
                            type="submit"
                            title={u.active ? "Revoke access" : "Restore access"}
                            className={
                              u.active
                                ? "rounded-lg p-2 text-danger-600 transition hover:bg-danger-50"
                                : "rounded-lg p-2 text-muted transition hover:bg-brand-50 hover:text-brand-700"
                            }
                          >
                            {u.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                          </button>
                        </form>
                      )}
                      {!self && (
                        <form action={removeUser.bind(null, u.id)}>
                          <button
                            type="submit"
                            title="Remove user"
                            className="rounded-lg p-2 text-danger-600 transition hover:bg-danger-50"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </form>
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
        Removing someone who created, owns or commented on a project revokes their access but keeps their name on the history.
      </p>
    </>
  );
}
