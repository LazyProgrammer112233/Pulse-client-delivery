import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Headphones, PackageCheck, Code2, ArrowRight } from "lucide-react";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { TEAMS, type Team } from "@/lib/teams";
import { Logo } from "@/components/logo";

const ICONS = { cst: Headphones, product: PackageCheck, tech: Code2 } as const;

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.team) redirect("/dashboard");

  async function chooseTeam(formData: FormData) {
    "use server";
    const me = await getCurrentUser();
    if (!me) redirect("/login");
    const team = String(formData.get("team")) as Team;
    if (!TEAMS.some((t) => t.id === team)) return;
    // Only first-time users pick their own team; later changes go through an admin
    if (!me.team) await db.update(schema.users).set({ team }).where(eq(schema.users.id, me.id));
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Logo />
        <h1 className="mt-12 text-3xl font-semibold tracking-tight text-ink">
          Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}. Which team are you on?
        </h1>
        <p className="mt-2 text-muted">
          This sets what you see when you sign in. An admin can change it later if you move teams.
        </p>

        <form action={chooseTeam} className="mt-8 grid gap-4 md:grid-cols-3">
          {TEAMS.map((t) => {
            const Icon = ICONS[t.id];
            return (
              <button
                key={t.id}
                type="submit"
                name="team"
                value={t.id}
                className="card-surface card-surface-hover group flex flex-col items-start p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <span className="mt-5 text-lg font-semibold text-ink">{t.name}</span>
                <span className="mt-1.5 text-sm text-muted">{t.description}</span>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                  Continue as {t.short} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </form>
      </div>
    </main>
  );
}
