import { Building2, Search } from "lucide-react";
import { requireUser } from "@/lib/session";
import { searchClients, countRows } from "@/lib/queries";
import { importClients } from "./actions";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CsvImport } from "@/components/admin/csv-import";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q = "" } = await searchParams;
  const [rows, counts] = await Promise.all([searchClients(q, 200), countRows()]);

  return (
    <>
      <PageHeader
        title="Clients"
        description={`${counts.clients} clients. Pulse companies come from the Pulse database; CST can add new ones from New client project.`}
      />
      {user.isAdmin && (
        <div className="mb-6">
          <CsvImport
            title="Import Pulse companies"
            action={importClients}
            help={
              <>
                Upload a CSV with <code className="rounded bg-brand-50 px-1 text-brand-700">Id</code> and{" "}
                <code className="rounded bg-brand-50 px-1 text-brand-700">Name</code> columns exported from{" "}
                <code className="rounded bg-brand-50 px-1 text-brand-700">Masters_GT_Replica.dbo.Companies</code>. Existing
                company IDs are updated, not duplicated.
              </>
            }
          />
        </div>
      )}
      <form className="mb-4 flex max-w-lg gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input name="q" defaultValue={q} placeholder="Search by name or company ID" className="pl-10" />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {rows.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-brand-50/40 text-xs font-medium uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Company ID</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{c.companyId ?? "Not linked"}</td>
                  <td className="px-4 py-3">
                    {c.source === "pulse" ? <Badge>Pulse</Badge> : <Badge tone="amber">Added by CST</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 200 && <p className="border-t border-line px-4 py-3 text-xs text-muted">Showing the first 200. Search to narrow down.</p>}
        </div>
      ) : (
        <EmptyState icon={Building2} title="No clients match">Try a different name or company ID.</EmptyState>
      )}
    </>
  );
}
