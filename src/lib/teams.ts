export type Team = "cst" | "product" | "tech";

export const TEAMS: { id: Team; name: string; short: string; description: string }[] = [
  {
    id: "cst",
    name: "Customer Success (CST)",
    short: "CST",
    description: "Bring in new clients, capture the BRD and review deliveries.",
  },
  {
    id: "product",
    name: "Product",
    short: "Product",
    description: "Own client projects, estimate effort, configure Pulse and set deadlines.",
  },
  {
    id: "tech",
    name: "Tech",
    short: "Tech",
    description: "Build what configuration cannot do and ship it to beta and prod.",
  },
];

export const teamName = (t?: Team | null) => TEAMS.find((x) => x.id === t)?.short ?? "No team";
