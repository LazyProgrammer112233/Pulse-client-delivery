import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/25">
        <Activity className="size-5" strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold text-ink">Pulse Delivery</span>
          <span className="block text-xs text-muted">Client delivery lifecycle</span>
        </span>
      )}
    </div>
  );
}
