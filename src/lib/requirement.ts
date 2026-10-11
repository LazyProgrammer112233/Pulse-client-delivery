// Shared vocabulary for the requirement builder (safe to import from client components)

export const ADDONS = [
  { id: "pulseAi", name: "Pulse AI chatbot", hint: "Ask questions about the dashboard data in plain language" },
  { id: "anomalyDetection", name: "Anomaly detection", hint: "Flags unusual drops or spikes in key KPIs" },
  { id: "irDashboard", name: "IR dashboard", hint: "Image recognition: shelf share, cooler purity, planogram" },
  { id: "productRecommendation", name: "Product recommendation", hint: "Recommended SKUs per outlet and their impact" },
] as const;

export type AddonId = (typeof ADDONS)[number]["id"];

export const CHART_TYPES = [
  "Bar",
  "Stacked bar",
  "Horizontal bar",
  "Line",
  "Area",
  "Combo (bar + line)",
  "Pie",
  "Donut",
  "Table",
  "Heat map",
  "Map",
  "Funnel",
  "Gauge",
] as const;

export const WIDTHS = [
  { id: "full", label: "Full width" },
  { id: "half", label: "Half" },
  { id: "third", label: "One third" },
] as const;

export const DEFAULT_COLORS = ["#1e56d9", "#5a8bf5", "#b9d0ff"];

export type ItemKind = "kpi" | "chart" | "dynamic_chart" | "composite_chart";
export const isChartKind = (k: ItemKind) => k !== "kpi";

export const KIND_LABEL: Record<ItemKind, string> = {
  kpi: "KPI card",
  chart: "Chart",
  dynamic_chart: "Dynamic chart",
  composite_chart: "Composite chart",
};

export type PageInput = { pageKey: string; name: string; tabs: string[]; notes: string };

export type ItemInput = {
  id?: string;
  kind: ItemKind;
  catalogId: string | null;
  configurationId: string | null;
  title: string;
  description: string;
  formula: string;
  logic: string;
  pageKey: string;
  tab: string;
  width: string;
  chartType: string;
  colors: string[];
};

export type ItemRow = ItemInput & { id: string };

/** Database row (project_items) to the shape the builder edits. */
export function toItemRow(i: {
  id: string;
  kind: ItemKind;
  catalogId: string | null;
  title: string;
  description: string | null;
  formula: string | null;
  logic: string | null;
  pageKey: string | null;
  tab: string | null;
  chartType: string | null;
  settings: unknown;
}): ItemRow {
  const s = (i.settings ?? {}) as { width?: string; colors?: unknown; configurationId?: string | null };
  return {
    id: i.id,
    kind: i.kind,
    catalogId: i.catalogId,
    configurationId: s.configurationId ?? null,
    title: i.title,
    description: i.description ?? "",
    formula: i.formula ?? "",
    logic: i.logic ?? "",
    pageKey: i.pageKey ?? "",
    tab: i.tab ?? "",
    width: s.width ?? "third",
    chartType: i.chartType ?? "",
    colors: Array.isArray(s.colors) ? s.colors.filter((c): c is string => typeof c === "string") : [],
  };
}

export type Branding = { displayName?: string; logo?: string; primaryColor?: string; secondaryColor?: string };

// Logos are stored inline in the database, so keep them small
export const LOGO_MAX_BYTES = 300 * 1024;
