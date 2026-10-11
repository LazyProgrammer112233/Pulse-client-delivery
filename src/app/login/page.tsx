import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/alert";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; signed_out?: string }>;
}) {
  const { next, email, signed_out } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.team ? "/dashboard" : "/onboarding");

  return (
    <AuthShell title="Log in" subtitle="Welcome back. Log in with the email and password you registered with.">
      {signed_out && (
        <Alert tone="success" className="mt-5">
          You&apos;re signed out.
        </Alert>
      )}
      <LoginForm next={next} email={email} />
    </AuthShell>
  );
}
