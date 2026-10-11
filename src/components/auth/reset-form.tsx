"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail, KeyRound, ArrowLeft } from "lucide-react";
import { requestReset, resetPassword, type AuthFormState } from "@/lib/auth-actions";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "./password-input";

export function ResetForm({ email: initialEmail }: { email?: string }) {
  const [requested, request] = useActionState<AuthFormState, FormData>(requestReset, undefined);
  const [resetState, reset] = useActionState<AuthFormState, FormData>(resetPassword, undefined);
  const onCodeStep = requested?.step === "code" || resetState?.step === "code";
  const email = resetState?.email ?? requested?.email ?? initialEmail ?? "";

  if (!onCodeStep) {
    return (
      <form action={request} className="mt-6 space-y-4">
        {requested?.error && <Alert>{requested.error}</Alert>}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoFocus defaultValue={email} placeholder="name@yourcompany.com" />
        </div>
        <SubmitButton size="lg" className="w-full justify-center" pendingText="Sending">
          <Mail />
          Email me a reset code
        </SubmitButton>
        <BackToLogin />
      </form>
    );
  }

  return (
    <form action={reset} className="mt-6 space-y-4">
      <Alert tone="info">
        We sent a 6-digit code to <span className="font-medium">{email}</span>. Check Junk if it isn&apos;t in your inbox.
      </Alert>
      {resetState?.error && <Alert>{resetState.error}</Alert>}
      <input type="hidden" name="email" value={email} />
      <div>
        <Label htmlFor="code">Reset code</Label>
        <Input
          id="code"
          name="code"
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          className="h-12 text-center text-xl font-semibold tracking-[0.4em]"
        />
      </div>
      <div>
        <Label htmlFor="password">New password</Label>
        <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" />
      </div>
      <SubmitButton size="lg" className="w-full justify-center" pendingText="Saving">
        <KeyRound />
        Set new password
      </SubmitButton>
      <BackToLogin />
    </form>
  );
}

function BackToLogin() {
  return (
    <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-muted hover:text-brand-700">
      <ArrowLeft className="size-4" />
      Back to log in
    </Link>
  );
}
