import { redirect } from "next/navigation";
import { AlertTriangle, ShieldCheck, LayoutDashboard, Workflow, Users } from "lucide-react";
import { signIn, isDevLoginEnabled, isMicrosoftConfigured } from "@/auth";
import { getCurrentUser } from "@/lib/session";
import { allowedDomain, isWorkEmail } from "@/lib/domain";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ERRORS: Record<string, string> = {
  not_work_email: `This email is not a work email. Please sign in with your @${allowedDomain} account.`,
  deactivated: "Your access to Pulse Delivery has been removed. Ask an admin to restore it.",
  AccessDenied: `This email is not a work email. Please sign in with your @${allowedDomain} account.`,
  Configuration: "Sign-in is not configured yet. Ask an admin to check the Microsoft app settings.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.team ? "/dashboard" : "/onboarding");

  const message = error
    ? (ERRORS[error] ?? "Sign-in failed. Please try again.")
    : !isMicrosoftConfigured
      ? ERRORS.Configuration
      : null;

  async function microsoft() {
    "use server";
    await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
  }

  async function dev(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!isWorkEmail(email)) redirect("/login?error=not_work_email");
    await signIn("dev", { email, redirectTo: "/dashboard" });
  }

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
          <div className="lg:hidden">
            <Logo />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-ink lg:mt-0">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your Flick2Know Microsoft 365 account.</p>

          {message && (
            <div
              role="alert"
              className="mt-5 flex gap-3 rounded-xl border border-danger-100 bg-danger-50 p-3.5 text-sm text-danger-700"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form action={microsoft} className="mt-6">
            <Button type="submit" size="lg" className="w-full justify-center" disabled={!isMicrosoftConfigured}>
              <MicrosoftMark />
              Sign in with Microsoft
            </Button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="size-3.5 text-brand-600" />
            Only @{allowedDomain} emails can access this workspace
          </p>

          {isDevLoginEnabled && (
            <form action={dev} className="mt-6 border-t border-line pt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Local development login</p>
              <div className="flex gap-2">
                <Input name="email" type="email" required placeholder={`name@${allowedDomain}`} />
                <Button type="submit" variant="outline">
                  Continue
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
