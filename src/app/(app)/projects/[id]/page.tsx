import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  UserRound,
  CalendarClock,
  Timer,
  Repeat,
  MessageSquare,
  History,
  LayoutGrid,
  ArrowRight,
  Link2,
  FileText,
  Trash2,
  Pencil,
  ExternalLink,
  Check,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { getProject, getRequirement, getTimeline, listLinks, listTeamMembers } from "@/lib/queries";
import { teamName } from "@/lib/teams";
import { formatDate, formatDateTime } from "@/lib/utils";
import { allowedRounds, canEditRequirement, isTeam } from "@/lib/workflow";
import { ADDONS, isChartKind } from "@/lib/requirement";
import { addComment, addLink, advance, removeLink } from "../actions";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClasses } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProductTypeLabel } from "@/components/projects/project-table";
import { Lifecycle } from "@/components/projects/lifecycle";
import { WorkflowPanel } from "@/components/projects/workflow-panel";
import { ActionForm } from "@/components/projects/action-form";

const LINK_ICON = { ado: Link2, file: FileText, url: ExternalLink } as const;
const LINK_LABEL = { ado: "Azure DevOps PBI", file: "File", url: "Link" } as const;

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser();
  const [data, timeline, req, links, productPeople] = await Promise.all([
    getProject(id),
    getTimeline(id),
    getRequirement(id),
    listLinks(id),
    listTeamMembers("product"),
  ]);
  if (!data) notFound();
  const { project, client } = data;

  const kpis = req.items.filter((i) => !isChartKind(i.kind)).length;
  const charts = req.items.length - kpis;
  const addons = ADDONS.filter((a) => req.addons[a.id]);
  const editable = canEditRequirement(user, project);
  const isProduct = isTeam(user, "product");
  const planEditable = isProduct && !["draft", "product_assigned", "live", "cancelled"].includes(project.status);

  const facts = [
    { icon: Building2, label: "Pulse company ID", value: client.companyId ?? "Not linked yet" },
    { icon: UserRound, label: "Product owner", value: data.ownerName ?? data.ownerEmail ?? "Unassigned" },
    { icon: CalendarClock, label: "Target date", value: formatDate(project.targetDate) },
    { icon: Timer, label: "Estimate", value: project.estimateManDays ? `${Number(project.estimateManDays)} man-days` : "Not estimated" },
    { icon: Repeat, label: "CST review round", value: `${project.reviewRound} of ${allowedRounds(project)}${project.extraRoundApprovedBy ? " (third round approved)" : ""}` },
  ];

  return (
    <>
      <div className="mb-6">
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

      <Card className="p-5">
        <Lifecycle status={project.status} />
      </Card>

      <div className="mt-6">
        <WorkflowPanel project={project} user={user} productPeople={productPeople} requirementReady={req.pages.length > 0 && req.items.length > 0} />
      </div>

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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Pages", value: req.pages.length },
                  { label: "KPI cards", value: kpis },
                  { label: "Charts", value: charts },
                  { label: "Add-ons", value: addons.length },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-line bg-white p-3">
                    <p className="text-2xl font-semibold text-ink">{s.value}</p>
                    <p className="text-xs text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
              {req.pages.length > 0 && (
                <p className="mt-3 text-sm text-muted">
                  {req.pages.map((p) => p.name).join(", ")}
                  {addons.length > 0 && ` · ${addons.map((a) => a.name).join(", ")}`}
                  {req.branding.logo && " · Logo added"}
                </p>
              )}
              <Link href={`/projects/${project.id}/requirement`} className={buttonClasses(editable && project.status === "draft" ? "primary" : "secondary", "md", "mt-4")}>
                {editable ? <Pencil /> : <ArrowRight />}
                {editable ? (req.items.length ? "Edit requirement" : "Build the requirement") : "View full requirement"}
              </Link>
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
                  <SubmitButton variant="secondary" size="sm" pendingText="Posting">
                    <MessageSquare />
                    Comment
                  </SubmitButton>
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
                      <span className="text-muted">{e.kind === "comment" ? "commented" : e.text.charAt(0).toLowerCase() + e.text.slice(1)}</span>
                    </p>
                    {e.kind === "comment" && (
                      <p className="mt-1.5 whitespace-pre-wrap rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink">{e.text}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(e.at)}</p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
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
              {planEditable && (
                <details className="mt-5 border-t border-line pt-3">
                  <summary className="cursor-pointer text-sm font-medium text-brand-600">Change owner, estimate or deadline</summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm
                      action={advance.bind(null, project.id, "assign_owner")}
                      variant="secondary"
                      fields={[
                        {
                          type: "select",
                          name: "ownerId",
                          label: "Product owner",
                          options: productPeople.map((u) => ({ value: u.id, label: u.name ?? u.email })),
                          defaultValue: project.productOwnerId ?? undefined,
                        },
                      ]}
                      submit={<><Check /> Save owner</>}
                    />
                    <ActionForm
                      action={advance.bind(null, project.id, "plan")}
                      variant="secondary"
                      fields={[
                        { type: "number", name: "manDays", label: "Man-days", defaultValue: project.estimateManDays ?? undefined },
                        { type: "date", name: "targetDate", label: "Target date", defaultValue: project.targetDate ?? undefined },
                        { type: "text", name: "reason", label: "Reason for the change", placeholder: "Shown on the timeline" },
                      ]}
                      submit={<><Check /> Save plan</>}
                    />
                  </div>
                </details>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Links and files</CardTitle>
                <CardDescription>Azure DevOps PBIs, documents and other links.</CardDescription>
              </div>
            </CardHeader>
            <CardBody>
              {links.length === 0 ? (
                <p className="text-sm text-muted">Nothing attached yet.</p>
              ) : (
                <ul className="space-y-2">
                  {links.map(({ link, by, byEmail }) => {
                    const Icon = LINK_ICON[link.kind];
                    const mine = link.addedBy === user.id || user.isAdmin;
                    return (
                      <li key={link.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-white p-2.5">
                        <Icon className="mt-0.5 size-4 shrink-0 text-brand-600" />
                        <div className="min-w-0 flex-1">
                          <a href={link.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-brand-700 hover:underline">
                            {link.label}
                          </a>
                          <p className="text-xs text-muted">
                            {LINK_LABEL[link.kind]} · {by ?? byEmail} · {formatDate(link.createdAt)}
                          </p>
                        </div>
                        {mine && (
                          <form action={removeLink.bind(null, project.id, link.id)}>
                            <button type="submit" title="Remove link" className="rounded-lg p-1.5 text-danger-600 hover:bg-danger-50">
                              <Trash2 className="size-4" />
                            </button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-600">Attach a link</summary>
                <div className="mt-3">
                  <ActionForm
                    action={addLink.bind(null, project.id)}
                    variant="secondary"
                    fields={[
                      {
                        type: "select",
                        name: "kind",
                        label: "Type",
                        defaultValue: "ado",
                        options: [
                          { value: "ado", label: "Azure DevOps PBI" },
                          { value: "file", label: "File (SharePoint, Drive, OneDrive)" },
                          { value: "url", label: "Other link" },
                        ],
                      },
                      { type: "text", name: "url", label: "Link", placeholder: "https://", required: true },
                      { type: "text", name: "label", label: "Title", placeholder: "e.g. PBI 48211: GIL Live homepage" },
                    ]}
                    submit={<><Link2 /> Attach</>}
                  />
                </div>
              </details>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
