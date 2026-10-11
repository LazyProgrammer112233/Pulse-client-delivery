"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { UserPlus, Headphones, PackageCheck, Code2 } from "lucide-react";
import { signup, type AuthFormState } from "@/lib/auth-actions";
import { TEAMS } from "@/lib/teams";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { PasswordInput } from "./password-input";

const ICONS = { cst: Headphones, product: PackageCheck, tech: Code2 } as const;

export function SignupForm({ email: initialEmail }: { email?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(signup, undefined);
  const [team, setTeam] = useState(state?.team ?? "");
  const email = state?.email ?? initialEmail ?? "";

  return (
    <form action={action} className="mt-6 space-y-4">
      {state?.error && (
        <Alert>
          {state.error}
          {state.step === "registered" && (
            <Link href="/login" className="ml-1 font-medium underline">
              Log in
            </Link>
          )}
        </Alert>
      )}
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required autoComplete="name" defaultValue={state?.name ?? ""} placeholder="Your name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={email} placeholder="name@yourcompany.com" />
        <p className="mt-1.5 text-xs text-muted">Please use your work email.</p>
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" />
        <p className="mt-1.5 text-xs text-muted">At least 8 characters, with a letter and a number.</p>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink">Your team</legend>
        <div className="grid grid-cols-3 gap-2">
          {TEAMS.map((t) => {
            const Icon = ICONS[t.id];
            const active = team === t.id;
            return (
              <label
                key={t.id}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border bg-white px-2 py-3 text-center text-sm transition",
                  active ? "border-brand-500 ring-4 ring-brand-100" : "border-line hover:border-brand-300",
                )}
              >
                <input type="radio" name="team" value={t.id} className="sr-only" checked={active} onChange={() => setTeam(t.id)} required />
                <Icon className={cn("size-5", active ? "text-brand-600" : "text-muted")} />
                <span className="font-medium text-ink">{t.short}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <SubmitButton size="lg" className="w-full justify-center" pendingText="Creating your account">
        <UserPlus />
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </form>
  );
}
