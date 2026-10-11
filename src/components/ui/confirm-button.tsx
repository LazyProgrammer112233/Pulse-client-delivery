"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { withToast } from "./toast";

/** Icon button that asks for confirmation before running a server action. */
export function ConfirmButton({
  action,
  message,
  title,
  pending: pendingText,
  done,
  danger,
  className,
  children,
}: {
  action: () => Promise<unknown>;
  message: string;
  title: string;
  pending: string;
  done: string;
  danger?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(message)) return;
        setPending(true);
        withToast(action, { pending: pendingText, done }).finally(() => setPending(false));
      }}
      className={cn(
        "rounded-lg p-2 transition disabled:opacity-50",
        danger ? "text-danger-600 hover:bg-danger-50" : "text-muted hover:bg-brand-50 hover:text-brand-700",
        className,
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}
