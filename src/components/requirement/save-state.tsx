"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import type { SaveResult } from "@/app/(app)/projects/[id]/requirement/actions";

/**
 * Runs a save action and tracks its outcome for the inline status line.
 * Plain state rather than useTransition: the transition also waits for the page refresh,
 * which can leave the button spinning after the save has already finished.
 */
export function useSave() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const run = async (fn: () => Promise<SaveResult>, after?: (r: SaveResult) => void) => {
    setPending(true);
    let r: SaveResult;
    try {
      r = await fn();
    } catch {
      r = { error: "Couldn't save. Check your connection and try again." };
    }
    setPending(false);
    setResult(r);
    if (r.ok) setDirty(false);
    after?.(r);
  };
  const markDirty = () => {
    setDirty(true);
    setResult(null);
  };
  return { pending, result, dirty, run, markDirty };
}

export function SaveStatus({ pending, result, dirty }: { pending: boolean; result: SaveResult | null; dirty: boolean }) {
  if (pending)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" /> Saving
      </span>
    );
  if (result?.error)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-danger-600">
        <AlertTriangle className="size-4" /> {result.error}
      </span>
    );
  if (dirty) return <span className="text-sm text-amber-700">Unsaved changes</span>;
  if (result?.ok)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
        <CheckCircle2 className="size-4" /> Saved
      </span>
    );
  return null;
}
