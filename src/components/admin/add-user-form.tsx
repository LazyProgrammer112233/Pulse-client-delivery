"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { addUser, type AdminState } from "@/app/(app)/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function AddUserForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(addUser, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="card-surface p-5">
      <div className="flex items-center gap-2">
        <UserPlus className="size-4 text-brand-600" />
        <h2 className="font-semibold text-ink">Add a user</h2>
      </div>
      <p className="mt-1 text-sm text-muted">Pre-approve a teammate and set their team before they sign in.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_0.8fr_auto_auto] md:items-end">
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" required placeholder="name@flick2know.com" />
        </div>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Optional" />
        </div>
        <div>
          <Label htmlFor="team">Team</Label>
          <Select id="team" name="team" defaultValue="cst">
            <option value="cst">CST</option>
            <option value="product">Product</option>
            <option value="tech">Tech</option>
          </Select>
        </div>
        <label className="flex h-10 items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="isAdmin" className="size-4 accent-brand-600" />
          Admin
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add user"}
        </Button>
      </div>
      {state?.error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-danger-600">
          <AlertTriangle className="size-4" />
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" />
          {state.ok}
        </p>
      )}
    </form>
  );
}
