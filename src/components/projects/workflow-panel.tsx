import Link from "next/link";
import {
  Send,
  UserCheck,
  Play,
  Code2,
  ClipboardCheck,
  Rocket,
  BadgeCheck,
  MessageSquareWarning,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  XCircle,
  Repeat,
  ThumbsUp,
  ThumbsDown,
  LayoutGrid,
  Hourglass,
  ArrowRight,
} from "lucide-react";
import { advance } from "@/app/(app)/projects/actions";
import type { CurrentUser } from "@/lib/session";
import { STATUS } from "@/lib/status";
import { teamName } from "@/lib/teams";
import { NEXT_STEP, allowedRounds, canRequestChanges, canRequestExtraRound, extraRoundPending, isTeam } from "@/lib/workflow";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { ActionForm } from "./action-form";

type Project = {
  id: string;
  status: keyof typeof STATUS;
  reviewRound: number;
  extraRoundRequested: boolean;
  extraRoundApprovedBy: string | null;
  estimateManDays: string | null;
  targetDate: string | null;
  productOwnerId: string | null;
};

/** The "what happens next" card: who holds the project, what they do, and the buttons for whoever can act. */
export function WorkflowPanel({
  project: p,
  user,
  productPeople,
  requirementReady,
}: {
  project: Project;
  user: CurrentUser;
  productPeople: { id: string; name: string | null; email: string }[];
  requirementReady: boolean;
}) {
  const act = (name: string) => advance.bind(null, p.id, name);
  const holding = STATUS[p.status].team;
  const isProduct = isTeam(user, "product");
  const isCst = isTeam(user, "cst");
  const isTech = isTeam(user, "tech");
  const owners = productPeople.map((u) => ({ value: u.id, label: u.name ? `${u.name} (${u.email})` : u.email }));
  const meInProduct = productPeople.some((u) => u.id === user.id) ? user.id : undefined;

  const actions: React.ReactNode[] = [];

  switch (p.status) {
    case "draft":
      if (isCst) {
        actions.push(
          <Link key="build" href={`/projects/${p.id}/requirement`} className={buttonClasses(requirementReady ? "outline" : "primary", "md")}>
            <LayoutGrid />
            {requirementReady ? "Edit requirement" : "Build the requirement"}
          </Link>,
        );
        if (requirementReady)
          actions.push(
            <ActionForm key="submit" action={act("submit")} submit={<><Send /> Submit to Product</>} className="inline-flex" />,
          );
      }
      break;
    case "product_assigned":
      if (isProduct)
        actions.push(
          <ActionForm
            key="owner"
            action={act("assign_owner")}
            fields={[{ type: "select", name: "ownerId", label: "Product owner", options: owners, defaultValue: meInProduct }]}
            submit={<><UserCheck /> Assign owner</>}
          />,
        );
      break;
    case "estimating":
      if (isProduct)
        actions.push(
          <ActionForm
            key="plan"
            action={act("plan")}
            fields={[
              { type: "number", name: "manDays", label: "Estimate (man-days)", placeholder: "e.g. 4", defaultValue: p.estimateManDays ?? undefined },
              { type: "date", name: "targetDate", label: "Target date", defaultValue: p.targetDate ?? undefined },
              { type: "hidden", name: "start", value: "1" },
            ]}
            submit={<><Play /> Save and start configuring</>}
          />,
        );
      break;
    case "configuring":
    case "changes_requested":
      if (isProduct) {
        actions.push(
          <ActionForm
            key="qa"
            action={act("to_qa")}
            fields={[{ type: "note", label: "Configuration done? (optional note)", placeholder: "What was configured in Pulse" }]}
            submit={<><ClipboardCheck /> Configuration done, start QA</>}
          />,
          <ActionForm
            key="tech"
            action={act("to_tech")}
            variant="secondary"
            fields={[{ type: "note", label: "Needs development?", placeholder: "What Tech should build. Add the Azure DevOps PBI under Links.", required: true }]}
            submit={<><Code2 /> Send to Tech</>}
          />,
        );
      }
      break;
    case "in_development":
      if (isTech)
        actions.push(
          <ActionForm
            key="deploy"
            action={act("deployed")}
            fields={[
              { type: "radio", name: "environment", label: "Deployed to", options: [{ value: "beta", label: "Beta" }, { value: "prod", label: "Prod" }] },
              { type: "note", label: "Release note (optional)", placeholder: "What changed, build or release number" },
            ]}
            submit={<><Rocket /> Mark deployed and hand back to Product</>}
          />,
        );
      break;
    case "product_qa":
      if (isProduct)
        actions.push(
          <ActionForm
            key="review"
            action={act("to_review")}
            fields={[{ type: "note", label: "Note for CST (optional)", placeholder: "Where to look, test logins, known limits" }]}
            submit={<><Send /> Send to CST for review round {p.reviewRound + 1}</>}
          />,
          <ActionForm
            key="back"
            action={act("to_tech")}
            variant="secondary"
            fields={[{ type: "note", label: "QA found issues?", placeholder: "What Tech needs to fix", required: true }]}
            submit={<><RotateCcw /> Send back to Tech</>}
          />,
        );
      break;
    case "cst_review":
      if (isCst) {
        actions.push(
          <ActionForm
            key="approve"
            action={act("approve")}
            confirm="Approve the delivery and mark the client live?"
            fields={[{ type: "note", label: "Sign-off note (optional)", placeholder: "Anything worth recording" }]}
            submit={<><BadgeCheck /> Approve and go live</>}
          />,
        );
        if (canRequestChanges(p))
          actions.push(
            <ActionForm
              key="changes"
              action={act("request_changes")}
              variant="danger-outline"
              fields={[{ type: "note", label: `Request changes (round ${p.reviewRound} of ${allowedRounds(p)})`, placeholder: "List each change the client needs", required: true }]}
              submit={<><MessageSquareWarning /> Request changes</>}
            />,
          );
        else if (canRequestExtraRound(p))
          actions.push(
            <ActionForm
              key="extra"
              action={act("request_extra_round")}
              variant="secondary"
              fields={[{ type: "note", label: "Both review rounds are used. Need a third?", placeholder: "Why another round is needed", required: true }]}
              submit={<><Repeat /> Ask Product for a third round</>}
            />,
          );
      }
      if (isProduct && extraRoundPending(p))
        actions.push(
          <div key="decide" className="grid gap-3 sm:grid-cols-2">
            <ActionForm action={act("approve_extra_round")} fields={[{ type: "note", label: "CST asked for a third review round", placeholder: "Optional note" }]} submit={<><ThumbsUp /> Approve third round</>} />
            <ActionForm action={act("decline_extra_round")} variant="danger-outline" fields={[{ type: "note", label: "Or decline it", placeholder: "Why not" }]} submit={<><ThumbsDown /> Decline</>} />
          </div>,
        );
      break;
    case "on_hold":
      if (isProduct) actions.push(<ActionForm key="resume" action={act("resume")} submit={<><PlayCircle /> Resume</>} className="inline-flex" />);
      break;
  }

  const waitingNote =
    p.status === "cst_review" && extraRoundPending(p) && !isProduct
      ? "Waiting for Product to approve a third review round."
      : null;
  const canManage = isProduct && !["live", "cancelled", "draft"].includes(p.status);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Next step</p>
          <p className="mt-1 text-base font-medium text-ink">{NEXT_STEP[p.status]}</p>
          {p.status !== "live" && p.status !== "cancelled" && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Hourglass className="size-4" />
              With {teamName(holding)}
              {actions.length === 0 && ". You'll see buttons here when it's your turn."}
            </p>
          )}
          {waitingNote && <p className="mt-1 text-sm text-amber-700">{waitingNote}</p>}
        </div>
      </div>

      {actions.length > 0 && <div className="mt-4 flex flex-col gap-3 [&>form.inline-flex]:self-start">{actions}</div>}

      {p.status === "draft" && !isCst && (
        <Link href={`/projects/${p.id}/requirement`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
          See the requirement so far <ArrowRight className="size-4" />
        </Link>
      )}

      {canManage && (
        <details className="mt-4 border-t border-line pt-3 text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">Pause or cancel</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {p.status !== "on_hold" && (
              <ActionForm action={act("hold")} variant="outline" fields={[{ type: "note", label: "Put on hold", placeholder: "Why it's paused (optional)" }]} submit={<><PauseCircle /> Put on hold</>} />
            )}
            <ActionForm action={act("cancel")} variant="danger" confirm="Cancel this project? This can't be undone." fields={[{ type: "note", label: "Cancel the project", placeholder: "Why it's cancelled", required: true }]} submit={<><XCircle /> Cancel project</>} />
          </div>
        </details>
      )}
    </Card>
  );
}
