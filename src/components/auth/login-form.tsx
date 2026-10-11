"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { login, type AuthFormState } from "@/lib/auth-actions";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "./password-input";

export function LoginForm({ next, email: initialEmail }: { next?: string; email?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(login, undefined);
  const email = state?.email ?? initialEmail ?? "";

  return (
    <form action={action} className="mt-6 space-y-4">
      {state?.error && (
        <Alert>
          {state.error}
          {state.step === "no_account" && (
            <Link href={`/signup?email=${encodeURIComponent(email)}`} className="ml-1 font-medium underline">
              Sign up
            </Link>
          )}
        </Alert>
      )}
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoFocus autoComplete="email" defaultValue={email} placeholder="name@yourcompany.com" />
        <p className="mt-1.5 text-xs text-muted">Please use your work email.</p>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="password" className="mb-0">
            Password
          </Label>
          <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="password" name="password" required autoComplete="current-password" />
      </div>
      <SubmitButton size="lg" className="w-full justify-center" pendingText="Logging in">
        <LogIn />
        Log in
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        New to Pulse Delivery?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>
    </form>
  );
}
