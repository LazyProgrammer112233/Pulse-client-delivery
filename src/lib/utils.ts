import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name?: string | null, email?: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s.@_-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

// Everyone using the portal works in India time; servers run in UTC
export const TZ = "Asia/Kolkata";

export function formatDateTime(value: Date) {
  return value.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Not set";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}
