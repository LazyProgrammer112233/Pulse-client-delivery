import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a code to set a new password.">
      <ResetForm email={email} />
    </AuthShell>
  );
}
