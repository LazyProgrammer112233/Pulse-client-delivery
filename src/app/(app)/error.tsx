"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// A tab opened before a new deployment can ask for code files that no longer exist; a reload fixes that
const isStaleBuild = (e: Error) => /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|reading 'call'/i.test(`${e.name} ${e.message}`);

/** Keeps the sidebar and the rest of the app usable when one page fails, and says what went wrong. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
    if (isStaleBuild(error)) {
      try {
        if (!sessionStorage.getItem("pd-reloaded")) {
          sessionStorage.setItem("pd-reloaded", "1");
          window.location.reload();
        }
      } catch {}
    }
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-16">
      <div className="card-surface p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-ink">This page hit a problem</h1>
            <p className="mt-1 text-sm text-muted">Anything you saved before this is safe. Try again, or reload the page if it keeps happening.</p>
            <p className="mt-3 break-words rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-muted">
              {error.message || "Unknown error"}
              {error.digest ? ` (ref ${error.digest})` : ""}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw />
            Reload page
          </Button>
          <Button
            type="button"
            onClick={() => {
              router.refresh();
              reset();
            }}
          >
            <RotateCcw />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
