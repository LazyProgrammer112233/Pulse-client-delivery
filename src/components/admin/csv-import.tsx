"use client";

import { useActionState } from "react";
import { Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ImportState } from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";

export function CsvImport({
  title,
  help,
  action,
}: {
  title: string;
  help: React.ReactNode;
  action: (state: ImportState, formData: FormData) => Promise<ImportState>;
}) {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(action, undefined);
  return (
    <form action={formAction} className="card-surface p-5">
      <div className="flex items-center gap-2">
        <Upload className="size-4 text-brand-600" />
        <h2 className="font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-1 text-sm text-muted">{help}</div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Importing..." : "Import"}
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
