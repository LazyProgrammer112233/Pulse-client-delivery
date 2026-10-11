import { cn } from "@/lib/utils";

const tones = {
  blue: "bg-brand-50 text-brand-700 ring-brand-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  red: "bg-danger-50 text-danger-700 ring-danger-100",
  gray: "bg-slate-50 text-slate-600 ring-slate-200",
};

export function Badge({
  tone = "blue",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset [&_svg]:size-3",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
