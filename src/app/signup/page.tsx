import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AuthShell title="Create your account" subtitle="Register once. Next time you just log in.">
      <SignupForm email={email} />
    </AuthShell>
  );
}
