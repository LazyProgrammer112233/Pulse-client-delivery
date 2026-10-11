import { LogOut, ShieldCheck } from "lucide-react";
import { logout } from "@/lib/auth-actions";
import { requireUser } from "@/lib/session";
import { teamName } from "@/lib/teams";
import { Logo } from "@/components/logo";
import { Nav } from "@/components/shell/nav";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { NavProgress } from "@/components/shell/nav-progress";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-white">
      <NavProgress />
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-gradient-to-b from-white to-brand-50/50 p-4 md:flex">
        <Logo className="px-2 py-1" />
        <div className="mt-8 flex-1">
          <Nav isAdmin={user.isAdmin} />
        </div>
        <div className="rounded-2xl border border-line bg-white p-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} email={user.email} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{user.name ?? user.email}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1">
              <Badge>{teamName(user.team)}</Badge>
              {user.isAdmin && (
                <Badge tone="gray">
                  <ShieldCheck />
                  Admin
                </Badge>
              )}
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Sign out"
                className="rounded-lg p-1.5 text-muted transition hover:bg-danger-50 hover:text-danger-600"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 bg-canvas">
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <Logo compact />
          <div className="flex items-center gap-2">
            <Avatar name={user.name} email={user.email} />
            <form action={logout}>
              <button type="submit" title="Sign out" className="rounded-lg p-1.5 text-muted hover:bg-danger-50 hover:text-danger-600">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <div className="border-b border-line bg-white px-3 py-2 md:hidden">
          <Nav isAdmin={user.isAdmin} horizontal />
        </div>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
