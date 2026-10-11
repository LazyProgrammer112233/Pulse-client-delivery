import { notFound } from "next/navigation";
import {
  Building2,
  UserRound,
  CalendarClock,
  Timer,
  Repeat,
  Send,
  MessageSquare,
  History,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { getProject, getTimeline } from "@/lib/queries";
import { teamName } from "@/lib/teams";
import { formatDate, formatDateTime } from "@/lib/utils";
import { assignToProduct, addComment } from "../actions";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/avatar";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProductTypeLabel } from "@/components/projects/project-table";
import { Lifecycle } from "@/components/projects/lifecycle";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser();
  const data = await getProject(id);
  if (!data) notFound();
  const { project, client } = data;
  const timeline = await getTimeline(id);

  const canAssign = project.status === "draft" && (user.team === "cst" || user.isAdmin);

  const facts = [
    { icon: Building2, label: "Pulse company ID", value: client.companyId ?? "Not linked yet" },
    { icon: UserRound, label: "Product owner", value: data.ownerName ?? data.ownerEmail ?? "Unassigned" },
    { icon: CalendarClock, label: "Target date", value: formatDate(project.targetDate) },
    { icon: Timer, label: "Estimate", value: project.estimateManDays ? `${project.estimateManDays} man-days` : "Not estimated" },
    { icon: Repeat, label: "CST review round", value: `${project.reviewRound} of 2` },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <span className="text-sm text-muted">With {teamName(project.holdingTeam)}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{client.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <ProductTypeLabel type={project.productType} />
            <span className="text-sm text-muted">
              Started by {data.creatorName ?? data.creatorEmail} on {formatDate(project.createdAt)}
            </span>
          </div>
        </div>
        {canAssign && (
          <form action={assignToProduct.bind(null, project.id)}>
            <Button type="submit" size="lg">
              <Send />
              Assign to Product
            </Button>
          </form>
        )}
      </div>

      <Card className="p-5">
        <Lifecycle status={project.status} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Requirement</CardTitle>
                <CardDescription>Pages, KPIs, charts, branding and add-ons for this client.</CardDescription>
              </div>
              <LayoutGrid className="size-5 text-brand-500" />
            </CardHeader>
            <CardBody>
              <div className="rounded-xl border border-dashed border-brand-200 bg-white p-5 text-sm text-muted">
                The requirement builder comes next: pick Pulse pages and tabs, then KPIs and charts from the catalog with
                formula, logic and placement, plus branding and add-ons like Pulse AI and anomaly detection.
                <span className="mt-3 flex items-center gap-1 font-medium text-brand-700">
                  Step 2 of the build <ArrowRight className="size-4" />
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Activity</CardTitle>
                <CardDescription>Hand-offs, changes and comments, newest first.</CardDescription>
              </div>
              <History className="size-5 text-brand-500" />
            </CardHeader>
            <CardBody>
              <form action={addComment.bind(null, project.id)} className="mb-6">
                <Textarea name="body" placeholder="Add a comment for CST, Product or Tech" required maxLength={5000} />
                <div className="mt-2 flex justify-end">
                  <Button type="submit" variant="secondary" size="sm">
                    <MessageSquare />
                    Comment
                  </Button>
                </div>
              </form>
              <ol className="relative space-y-5 border-l border-line pl-6">
                {timeline.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[37px] top-0">
                      <Avatar name={e.actor} className="size-6 text-[10px] ring-4 ring-white" />
                    </span>
                    <p className="text-sm">
                      <span className="font-medium text-ink">{e.actor}</span>{" "}
                      <span className="text-muted">
                        {e.kind === "comment" ? "commented" : e.text.charAt(0).toLowerCase() + e.text.slice(1)}
                      </span>
                    </p>
                    {e.kind === "comment" && (
                      <p className="mt-1.5 whitespace-pre-wrap rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink">
                        {e.text}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(e.at)}
                    </p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="space-y-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="text-sm font-medium text-ink">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
