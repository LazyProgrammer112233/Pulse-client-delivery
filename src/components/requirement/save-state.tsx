"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { SaveResult } from "@/app/(app)/projects/[id]/requirement/actions";
import { withToast } from "@/components/ui/toast";

/**
 * Runs a save action with a status pop-up and tracks unsaved edits.
 * Saves update the editors' own state; nothing waits on a page refresh.
 */
export function useSave() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const run = async <R extends SaveResult>(fn: () => Promise<R>, msg: { pending: string; done: string }, after?: (r: R) => void) => {
    setPending(true);
    setError(null);
    const r = (await withToast(fn, msg)) as R;
    setPending(false);
    if (r.error) setError(r.error);
    else setDirty(false);
    after?.(r);
    return r;
  };
  const markDirty = () => {
    setDirty(true);
    setError(null);
  };
  return { pending, error, dirty, run, markDirty };
}

/** Inline hint next to a save button: unsaved edits or the last error. Progress shows in the pop-up. */
export function SaveStatus({ error, dirty }: { error: string | null; dirty: boolean }) {
  if (error)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-danger-600">
        <AlertTriangle className="size-4" /> {error}
      </span>
    );
  if (dirty) return <span className="text-sm text-amber-700">Unsaved changes</span>;
  return null;
}
