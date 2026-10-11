import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  error: { box: "border-danger-100 bg-danger-50 text-danger-700", icon: AlertTriangle },
  success: { box: "border-emerald-100 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  info: { box: "border-brand-100 bg-brand-50 text-brand-800", icon: Info },
};

export function Alert({
  tone = "error",
  className,
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: React.ReactNode;
}) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-3.5 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
