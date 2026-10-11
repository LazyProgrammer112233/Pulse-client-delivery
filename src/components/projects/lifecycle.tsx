import { Check } from "lucide-react";
import type { ProjectStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

const STEPS: { key: ProjectStatus; label: string; team: string }[] = [
  { key: "draft", label: "Requirement", team: "CST" },
  { key: "product_assigned", label: "Owner", team: "Product" },
  { key: "estimating", label: "Estimate", team: "Product" },
  { key: "configuring", label: "Configure", team: "Product" },
  { key: "in_development", label: "Develop", team: "Tech" },
  { key: "deployed", label: "Deploy", team: "Tech" },
  { key: "product_qa", label: "QA", team: "Product" },
  { key: "cst_review", label: "Review", team: "CST" },
  { key: "live", label: "Live", team: "CST" },
];

// changes_requested sends work back to configuration; on_hold and cancelled freeze where it was
const POSITION: Partial<Record<ProjectStatus, ProjectStatus>> = { changes_requested: "configuring" };

/** One unified view of where a project sits in the delivery lifecycle. */
export function Lifecycle({ status }: { status: ProjectStatus }) {
  const current = STEPS.findIndex((s) => s.key === (POSITION[status] ?? status));
  return (
    <ol className="flex w-full overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done = current > i || status === "live";
        const active = current === i && status !== "live";
        return (
          <li key={s.key} className="flex min-w-[88px] flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done || active ? "bg-brand-500" : "bg-line")} />
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  done && "border-brand-600 bg-brand-600 text-white",
                  active && "border-brand-600 bg-white text-brand-700 ring-4 ring-brand-100",
                  !done && !active && "border-line bg-white text-slate-400",
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn("h-0.5 flex-1", i === STEPS.length - 1 ? "bg-transparent" : done ? "bg-brand-500" : "bg-line")} />
            </div>
            <span className={cn("mt-2 text-xs font-medium", active ? "text-brand-700" : done ? "text-ink" : "text-muted")}>
              {s.label}
            </span>
            <span className="text-[11px] text-slate-400">{s.team}</span>
          </li>
        );
      })}
    </ol>
  );
}
