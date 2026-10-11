import type { ProjectStatus } from "./status";
import type { Team } from "./teams";

type Actor = { team: Team | null; isAdmin: boolean };
type ProjectLike = { status: ProjectStatus; reviewRound: number; extraRoundRequested: boolean; extraRoundApprovedBy: string | null };

const CLOSED: ProjectStatus[] = ["live", "cancelled"];

export const isTeam = (u: Actor, ...teams: Team[]) => u.isAdmin || (!!u.team && teams.includes(u.team));

/** Only CST writes the requirement, at any stage until the project is cancelled. Product and Tech read it. */
export function canEditRequirement(u: Actor, p: Pick<ProjectLike, "status">) {
  return p.status !== "cancelled" && isTeam(u, "cst");
}

/** Tech works only on projects Product has handed to them, while they're still running. */
export const TECH_HIDDEN: ProjectStatus[] = ["draft", "product_assigned", "estimating", ...CLOSED];

/** Tech members (not admins) see a narrower set of projects. */
export const techOnly = (u: Actor) => u.team === "tech" && !u.isAdmin;

/** Review rounds CST may use: two, plus a third once Product approves the request. */
export const allowedRounds = (p: ProjectLike) => (p.extraRoundApprovedBy ? 3 : 2);

export function canRequestChanges(p: ProjectLike) {
  return p.status === "cst_review" && p.reviewRound < allowedRounds(p);
}

export function canRequestExtraRound(p: ProjectLike) {
  return p.status === "cst_review" && p.reviewRound >= 2 && !p.extraRoundRequested && !p.extraRoundApprovedBy;
}

export const extraRoundPending = (p: ProjectLike) => p.extraRoundRequested && !p.extraRoundApprovedBy;

/** What the holding team has to do next, in plain words. */
export const NEXT_STEP: Record<ProjectStatus, string> = {
  draft: "CST fills in the requirement, then submits it to Product.",
  product_assigned: "Product picks an owner for this client.",
  estimating: "The product owner estimates man-days and sets a target date.",
  configuring: "Product configures the dashboard in Pulse, then sends it to Tech or straight to QA.",
  in_development: "Tech builds what configuration can't do, deploys to beta or prod, and hands back to Product.",
  deployed: "Product checks the deployment.",
  product_qa: "Product checks the delivery, then sends it to CST for review.",
  cst_review: "CST reviews the delivery: approve it to go live, or request changes.",
  changes_requested: "Product fixes what CST asked for, in configuration or with Tech.",
  live: "Delivered and signed off by CST.",
  on_hold: "Paused. Product can resume it.",
  cancelled: "Cancelled.",
};
