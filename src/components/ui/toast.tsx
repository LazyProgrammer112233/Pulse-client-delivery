"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "pending" | "success" | "error";
type Toast = { id: string; tone: Tone; text: string; at: number };

// A tiny module-level store so any client code can raise a toast, even after the component that started it unmounts
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const emit = () => listeners.forEach((l) => l());
let seq = 0;

const LIFETIME: Record<Tone, number> = { pending: 30_000, success: 3_500, error: 8_000 };

function show(tone: Tone, text: string, id = `t${++seq}`) {
  const next = { id, tone, text, at: Date.now() };
  toasts = toasts.some((t) => t.id === id) ? toasts.map((t) => (t.id === id ? next : t)) : [...toasts, next].slice(-4);
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => dismiss(id), LIFETIME[tone]));
  emit();
  return id;
}

function dismiss(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  pending: (text: string, id?: string) => show("pending", text, id),
  success: (text: string, id?: string) => show("success", text, id),
  error: (text: string, id?: string) => show("error", text, id),
  dismiss,
};

const isNextNavigation = (e: unknown) =>
  typeof e === "object" && e !== null && typeof (e as { digest?: unknown }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_");

/**
 * Runs an action with a pending toast that turns into a success or error toast.
 * Results shaped like { error } count as failures. Redirects still happen.
 */
export async function withToast<T>(
  fn: () => Promise<T>,
  msg: { pending: string; done: string | ((r: T) => string | undefined) },
): Promise<T | { error: string }> {
  const id = toast.pending(msg.pending);
  try {
    const r = await fn();
    const err = (r as { error?: string } | undefined)?.error;
    if (err) toast.error(err, id);
    else toast.success((typeof msg.done === "function" ? msg.done(r) : msg.done) ?? "Done", id);
    return r;
  } catch (e) {
    if (isNextNavigation(e)) {
      toast.success(typeof msg.done === "string" ? msg.done : "Done", id);
      throw e;
    }
    const error = "That didn't go through. Reload the page and try again.";
    toast.error(error, id);
    return { error };
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => toasts;
const empty: Toast[] = [];

/** Bottom-right stack of status pop-ups. Mounted once in the app layout. */
export function Toaster() {
  const list = useSyncExternalStore(subscribe, snapshot, () => empty);
  const pathname = usePathname();
  // A redirect after an action means it finished; don't leave a spinner behind on the new page
  useEffect(() => {
    toasts.filter((t) => t.tone === "pending").forEach((t) => dismiss(t.id));
  }, [pathname]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col items-end gap-2">
      {list.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cn(
            "toast-in pointer-events-auto flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-lg",
            t.tone === "error" ? "bg-danger-600 shadow-danger-600/20" : "bg-emerald-600 shadow-emerald-600/20",
          )}
        >
          {t.tone === "pending" ? (
            <Loader2 className="size-4 shrink-0 animate-spin" />
          ) : t.tone === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1">{t.text}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-mr-1 rounded-lg p-1 text-white/80 hover:bg-white/15 hover:text-white">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
