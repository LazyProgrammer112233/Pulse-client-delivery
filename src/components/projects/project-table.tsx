import Link from "next/link";
import { Globe, Smartphone, Layers, ChevronRight } from "lucide-react";
import type { ProjectRow } from "@/lib/queries";
import { teamName } from "@/lib/teams";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

const PRODUCT = {
  web: { label: "Web dashboard", icon: Globe },
  app: { label: "Pulse app", icon: Smartphone },
  both: { label: "Web and app", icon: Layers },
} as const;

export function ProductTypeLabel({ type }: { type: keyof typeof PRODUCT }) {
  const { label, icon: Icon } = PRODUCT[type];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <Icon className="size-3.5 text-brand-500" />
      {label}
    </span>
  );
}

export function ProjectTable({ rows }: { rows: ProjectRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-brand-50/40 text-xs font-medium uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">With</th>
            <th className="px-4 py-3">Product owner</th>
            <th className="px-4 py-3">Target date</th>
            <th className="w-8 px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((p) => (
            <tr key={p.id} className="group transition hover:bg-brand-50/40">
              <td className="px-4 py-3">
                <Link href={`/projects/${p.id}`} className="block">
                  <span className="font-medium text-ink group-hover:text-brand-700">{p.clientName}</span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <ProductTypeLabel type={p.productType} />
                    {p.companyId && <span className="text-xs text-slate-400">ID {p.companyId}</span>}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-4 py-3 text-muted">{teamName(p.holdingTeam)}</td>
              <td className="px-4 py-3 text-muted">{p.ownerName ?? p.ownerEmail ?? "Unassigned"}</td>
              <td className="px-4 py-3 text-muted">{formatDate(p.targetDate)}</td>
              <td className="px-4 py-3">
                <Link href={`/projects/${p.id}`} aria-label={`Open ${p.clientName}`}>
                  <ChevronRight className="size-4 text-slate-300 group-hover:text-brand-600" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
