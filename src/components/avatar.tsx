import { cn, initials } from "@/lib/utils";

export function Avatar({ name, email, className }: { name?: string | null; email?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700",
        className,
      )}
      title={name || email || undefined}
    >
      {initials(name, email)}
    </span>
  );
}
