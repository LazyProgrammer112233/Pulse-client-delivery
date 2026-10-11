import { STATUS, type ProjectStatus } from "@/lib/status";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </Badge>
  );
}
