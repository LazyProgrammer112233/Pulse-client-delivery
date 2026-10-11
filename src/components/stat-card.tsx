import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "blue",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  hint?: string;
  tone?: "blue" | "red";
}) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl",
            tone === "red" ? "bg-danger-50 text-danger-600" : "bg-brand-50 text-brand-600",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
