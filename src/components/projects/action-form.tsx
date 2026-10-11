"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/(app)/projects/actions";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import type { ButtonProps } from "@/components/ui/button";

export type Field =
  | { type: "note"; label?: string; placeholder: string; required?: boolean }
  | { type: "select"; name: string; label: string; options: { value: string; label: string }[]; defaultValue?: string }
  | { type: "number"; name: string; label: string; placeholder?: string; defaultValue?: string; step?: string }
  | { type: "date"; name: string; label: string; defaultValue?: string }
  | { type: "text"; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: "radio"; name: string; label: string; options: { value: string; label: string }[] }
  | { type: "hidden"; name: string; value: string };

/** One lifecycle action: its inputs, a submit button with a pending state, and any error from the server. */
export function ActionForm({
  action,
  fields = [],
  submit,
  variant = "primary",
  confirm,
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields?: Field[];
  submit: React.ReactNode;
  variant?: ButtonProps["variant"];
  confirm?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const inline = fields.filter((f) => f.type !== "hidden").length > 0;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={className ?? (inline ? "space-y-3 rounded-xl border border-line bg-white p-4" : undefined)}
    >
      {state?.error && <Alert>{state.error}</Alert>}
      {fields.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f, i) => (
            <FieldInput key={i} field={f} />
          ))}
        </div>
      )}
      <SubmitButton variant={variant} className={inline ? "w-full justify-center sm:w-auto" : undefined}>
        {submit}
      </SubmitButton>
    </form>
  );
}

function FieldInput({ field: f }: { field: Field }) {
  switch (f.type) {
    case "hidden":
      return <input type="hidden" name={f.name} value={f.value} />;
    case "note":
      return (
        <div className="sm:col-span-2">
          {f.label && <Label>{f.label}</Label>}
          <Textarea name="note" required={f.required} placeholder={f.placeholder} maxLength={4000} className="min-h-20" />
        </div>
      );
    case "select":
      return (
        <div className="sm:col-span-2">
          <Label>{f.label}</Label>
          <Select name={f.name} defaultValue={f.defaultValue} required>
            <option value="">Choose</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      );
    case "number":
      return (
        <div>
          <Label>{f.label}</Label>
          <Input name={f.name} type="number" min="0.5" step={f.step ?? "0.5"} required defaultValue={f.defaultValue} placeholder={f.placeholder} />
        </div>
      );
    case "date":
      return (
        <div>
          <Label>{f.label}</Label>
          <Input name={f.name} type="date" required defaultValue={f.defaultValue} />
        </div>
      );
    case "text":
      return (
        <div className="sm:col-span-2">
          <Label>{f.label}</Label>
          <Input name={f.name} required={f.required} placeholder={f.placeholder} />
        </div>
      );
    case "radio":
      return (
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-medium text-ink">{f.label}</legend>
          <div className="flex flex-wrap gap-2">
            {f.options.map((o, i) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input type="radio" name={f.name} value={o.value} required defaultChecked={i === 0} className="accent-brand-600" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      );
  }
}
