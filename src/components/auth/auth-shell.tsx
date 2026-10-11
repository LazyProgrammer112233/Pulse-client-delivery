import { LayoutDashboard, Workflow, Users } from "lucide-react";
import { Logo } from "@/components/logo";

/** Shared frame for login, sign-up and password reset: product pitch on the left, form card on the right. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,var(--color-brand-100),transparent),radial-gradient(50%_40%_at_100%_100%,var(--color-brand-50),transparent)]" />
      <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        <section className="hidden lg:block">
          <Logo />
          <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight text-ink">
            Every Pulse client, from BRD to go-live, <span className="text-brand-600">in one place.</span>
          </h1>
          <p className="mt-4 max-w-md text-muted">
            CST captures what the client needs, Product owns delivery, Tech ships what configuration cannot. Everyone
            sees the same timeline.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-ink">
            {[
              { icon: LayoutDashboard, text: "Pick KPIs, charts and pages from the real Pulse catalog" },
              { icon: Workflow, text: "Hand-offs, deadlines and review rounds tracked automatically" },
              { icon: Users, text: "Separate views for CST, Product and Tech" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        <section className="card-surface mx-auto w-full max-w-md p-8">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          {children}
          <p className="mt-6 text-center text-[11px] text-muted/70">
            Version {(process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)}
          </p>
        </section>
      </div>
    </main>
  );
}
