import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  bigint,
  numeric,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const teamEnum = pgEnum("team", ["cst", "product", "tech"]);
export const productTypeEnum = pgEnum("product_type", ["web", "app", "both"]);
export const clientSourceEnum = pgEnum("client_source", ["pulse", "manual"]);

// The single lifecycle a project moves through. The holding team is derived from it.
export const projectStatusEnum = pgEnum("project_status", [
  "draft", // CST is filling the requirement
  "product_assigned", // waiting for a product owner
  "estimating", // owner set, estimating man-days and deadline
  "configuring", // product configuring in Pulse
  "in_development", // tech building what config cannot do
  "deployed", // tech deployed to beta or prod
  "product_qa", // product verifying before CST review
  "cst_review", // CST reviewing the delivery
  "changes_requested", // CST sent it back to product
  "live", // CST signed off
  "on_hold",
  "cancelled",
]);

export const catalogKindEnum = pgEnum("catalog_kind", ["kpi", "chart", "dynamic_chart", "composite_chart"]);
export const linkKindEnum = pgEnum("link_kind", ["ado", "file", "url"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  team: teamEnum("team"),
  isAdmin: boolean("is_admin").notNull().default(false),
  active: boolean("active").notNull().default(true),
  // scrypt hash; null until the person registers (for example an account an admin added)
  passwordHash: text("password_hash"),
  passwordUpdatedAt: timestamp("password_updated_at", { withTimezone: true }),
  registeredAt: timestamp("registered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastLogoutAt: timestamp("last_logout_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

// One row per signed-in browser. The cookie holds a random token; only its SHA-256 hash is stored.
export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Set when the session stops: logout, password_reset, revoked by an admin, deactivated
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endReason: text("end_reason"),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [uniqueIndex("user_sessions_token_idx").on(t.tokenHash), index("user_sessions_user_idx").on(t.userId)],
);

// Audit trail of sign-ups, logins (and failed attempts), logouts and password changes
export const authEvents = pgTable(
  "auth_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    type: text("type").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_events_email_idx").on(t.email, t.createdAt), index("auth_events_created_idx").on(t.createdAt)],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Pulse company ID; null for clients added manually before they exist in Pulse
    companyId: bigint("company_id", { mode: "number" }),
    source: clientSourceEnum("source").notNull().default("manual"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("clients_company_id_idx").on(t.companyId), index("clients_name_idx").on(t.name)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    title: text("title").notNull(),
    productType: productTypeEnum("product_type").notNull(),
    status: projectStatusEnum("status").notNull().default("draft"),
    holdingTeam: teamEnum("holding_team").notNull().default("cst"),
    productOwnerId: uuid("product_owner_id").references(() => users.id),
    estimateManDays: numeric("estimate_man_days", { precision: 6, scale: 1 }),
    targetDate: date("target_date"),
    reviewRound: integer("review_round").notNull().default(0),
    // A third CST review round needs the product team to approve the request
    extraRoundRequested: boolean("extra_round_requested").notNull().default(false),
    extraRoundApprovedBy: uuid("extra_round_approved_by").references(() => users.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("projects_status_idx").on(t.status), index("projects_holding_idx").on(t.holdingTeam)],
);

// Requirement: which Pulse pages and tabs the client gets, with page-level switches
export const projectPages = pgTable("project_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  pageKey: text("page_key").notNull(),
  name: text("name").notNull(),
  tabs: jsonb("tabs").$type<string[]>().notNull().default([]),
  options: jsonb("options").$type<Record<string, boolean>>().notNull().default({}),
  displayOrder: integer("display_order").notNull().default(0),
  notes: text("notes"),
});

// Requirement: one KPI card or chart placed on a page tab, from the catalog or custom
export const projectItems = pgTable("project_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: catalogKindEnum("kind").notNull(),
  catalogId: uuid("catalog_id").references(() => catalogItems.id),
  isCustom: boolean("is_custom").notNull().default(false),
  pageKey: text("page_key"),
  tab: text("tab"),
  title: text("title").notNull(),
  description: text("description"),
  formula: text("formula"),
  logic: text("logic"),
  chartType: text("chart_type"),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  displayOrder: integer("display_order").notNull().default(0),
});

// Requirement: branding, add-ons (Pulse AI, anomaly detection, IR...), app sections
export const projectSettings = pgTable("project_settings", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  branding: jsonb("branding").$type<Record<string, unknown>>().notNull().default({}),
  addons: jsonb("addons").$type<Record<string, boolean>>().notNull().default({}),
  appSections: jsonb("app_sections").$type<string[]>().notNull().default([]),
  extra: jsonb("extra").$type<Record<string, unknown>>().notNull().default({}),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: linkKindEnum("kind").notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  addedBy: uuid("added_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Every hand-off, status change, deadline change and edit; drives the timeline view
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id),
    type: text("type").notNull(),
    fromStatus: projectStatusEnum("from_status"),
    toStatus: projectStatusEnum("to_status"),
    message: text("message"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_project_idx").on(t.projectId, t.createdAt)],
);

// Copy of the Pulse configuration catalog (KPIs and charts), refreshed by import or sync
export const catalogItems = pgTable(
  "catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: catalogKindEnum("kind").notNull(),
    configurationId: text("configuration_id").notNull(),
    title: text("title"),
    description: text("description"),
    chartType: text("chart_type"),
    outputType: text("output_type"),
    database: text("database"),
    active: boolean("active").notNull().default(true),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("catalog_items_kind_cfg_idx").on(t.kind, t.configurationId)],
);

// Pulse dashboard pages (Homepage, Sales, Distributor...) and the tabs they usually carry
export const catalogPages = pgTable("catalog_pages", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  defaultTabs: jsonb("default_tabs").$type<string[]>().notNull().default([]),
  usedBy: integer("used_by").notNull().default(0),
});

// One-time password-reset codes sent by email. Only a hash of the code is stored.
export const loginCodes = pgTable(
  "login_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_codes_email_idx").on(t.email, t.createdAt)],
);
