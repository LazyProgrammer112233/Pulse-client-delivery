import type { Team } from "./teams";

export type ProjectStatus =
  | "draft"
  | "product_assigned"
  | "estimating"
  | "configuring"
  | "in_development"
  | "deployed"
  | "product_qa"
  | "cst_review"
  | "changes_requested"
  | "live"
  | "on_hold"
  | "cancelled";

export const STATUS: Record<ProjectStatus, { label: string; team: Team; tone: "blue" | "amber" | "green" | "red" | "gray" }> = {
  draft: { label: "Draft", team: "cst", tone: "gray" },
  product_assigned: { label: "Awaiting product owner", team: "product", tone: "amber" },
  estimating: { label: "Estimating", team: "product", tone: "blue" },
  configuring: { label: "Configuring", team: "product", tone: "blue" },
  in_development: { label: "In development", team: "tech", tone: "blue" },
  deployed: { label: "Deployed", team: "tech", tone: "blue" },
  product_qa: { label: "Product QA", team: "product", tone: "blue" },
  cst_review: { label: "CST review", team: "cst", tone: "amber" },
  changes_requested: { label: "Changes requested", team: "product", tone: "red" },
  live: { label: "Live", team: "cst", tone: "green" },
  on_hold: { label: "On hold", team: "product", tone: "gray" },
  cancelled: { label: "Cancelled", team: "cst", tone: "gray" },
};
