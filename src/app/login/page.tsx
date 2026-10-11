import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ShieldCheck, LayoutDashboard, Workflow, Users, Mail, ArrowLeft, KeyRound } from "lucide-react";
import { signIn, isMicrosoftConfigured } from "@/auth";
import { getCurrentUser } from "@/lib/session";
import { allowedDomain, isWorkEmail } from "@/lib/domain";
import { requestCode, verifyLoginCode } from "./actions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const ERRORS: Record<string, string> = {
  not_work_email: `This email is not a work email. Please use your @${allowedDomain} email address.`,
  deactivated: "Your access to Pulse Delivery has been removed. Ask an admin to restore it.",
  AccessDenied: `This email is not a work email. Please use your @${allowedDomain} email address.`,
  invalid_code: "That code is wrong or has expired. Check the latest email or send a new code.",
  send_failed: "We couldn't send the code. Try again in a minute, or tell an admin if it keeps failing.",
  rate_limited: "Too many codes requested. Wait 15 minutes and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; step?: string; email?: string }>;
}) {
  const { error, step, email = "" } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.team ? "/dashboard" : "/onboarding");

  const onCodeStep = step === "code" && isWorkEmail(email);
  const message = error ? (ERRORS[error] ?? "Sign-in failed. Please try again.") : null;

  async function microsoft() {
    "use server";
    await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
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

          {onCodeStep ? (
            <>
              <span className="mt-6 flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 lg:mt-0">
                <Mail className="size-5" />
              </span>
              <h2 className="mt-4 text-2xl font-semibold text-ink">Check your email</h2>
              <p className="mt-1 text-sm text-muted">
                We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>. It expires in 10 minutes.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-6 text-2xl font-semibold text-ink lg:mt-0">Sign in</h2>
              <p className="mt-1 text-sm text-muted">We&apos;ll email you a one-time code. No password needed.</p>
            </>
          )}

          {message && (
            <div
              role="alert"
              className="mt-5 flex gap-3 rounded-xl border border-danger-100 bg-danger-50 p-3.5 text-sm text-danger-700"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {onCodeStep ? (
            <>
              <form action={verifyLoginCode} className="mt-6">
                <input type="hidden" name="email" value={email} />
                <Label htmlFor="code">Sign-in code</Label>
                <Input
                  id="code"
                  name="code"
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  className="h-12 text-center text-2xl font-semibold tracking-[0.5em]"
                />
                <Button type="submit" size="lg" className="mt-4 w-full justify-center">
                  <KeyRound />
                  Verify and sign in
                </Button>
              </form>
              <div className="mt-4 flex items-center justify-between text-sm">
                <Link href={`/login?email=${encodeURIComponent(email)}`} className="inline-flex items-center gap-1 text-muted hover:text-brand-700">
                  <ArrowLeft className="size-4" />
                  Use a different email
                </Link>
                <form action={requestCode}>
                  <input type="hidden" name="email" value={email} />
                  <button type="submit" className="font-medium text-brand-600 hover:text-brand-700">
                    Send a new code
                  </button>
                </form>
              </div>
            </>
          ) : (
            <form action={requestCode} className="mt-6">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                defaultValue={email}
                placeholder={`name@${allowedDomain}`}
              />
              <Button type="submit" size="lg" className="mt-4 w-full justify-center">
                <Mail />
                Email me a code
              </Button>
            </form>
          )}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="size-3.5 text-brand-600" />
            Only @{allowedDomain} emails can access this workspace
          </p>

          {isMicrosoftConfigured && !onCodeStep && (
            <form action={microsoft} className="mt-6 border-t border-line pt-6">
              <Button type="submit" variant="outline" size="lg" className="w-full justify-center">
                <MicrosoftMark />
                Sign in with Microsoft
              </Button>
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
