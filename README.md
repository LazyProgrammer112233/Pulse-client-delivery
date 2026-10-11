# Pulse Delivery

Internal portal for delivering Pulse web dashboards and the Pulse app to new clients. CST captures the requirement, Product owns delivery, Tech builds what configuration cannot do, and everyone follows one timeline until CST signs off.

## Stack (all on free tiers)

| Part | Choice |
| --- | --- |
| App | Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Lucide icons |
| Hosting | Vercel Hobby |
| Database | Neon Postgres free tier, through Vercel's Neon integration |
| ORM | Drizzle (migrations in `drizzle/`) |
| Sign-in | Email and password (scrypt hashes), database-backed sessions in an httpOnly cookie |
| Email | Any SMTP sender for password resets and hand-off nudges; Brevo free tier or a Gmail app password |

## What works today

- **Sign up once, then log in.** Anyone can register with name, email, password and team; the form asks for a work email. Registered people log in with email and password. Wrong passwords are counted (8 in 15 minutes locks the email for 15 minutes), "Forgot password?" emails a reset code, and an admin can clear a password so the person registers again.
- **Sessions are tracked.** Each login creates a session row; logout, a password reset or an admin revoking access ends it. Users and roles shows who is registered, who is online, last login and last logout, plus a sign-in activity log.
- **CST** creates a client project (Pulse company or a new client, web dashboard, app or both) and lands in the requirement builder:
  1. Pages and tabs from the Pulse page catalog
  2. KPI cards and charts from the Pulse catalog (822 active configurations seeded) or custom, with formula, logic, page, tab, size, chart type and colors
  3. Branding: logo upload (up to 300 KB), display name, colors, live preview
  4. Add-ons: Pulse AI chatbot, anomaly detection, IR dashboard, product recommendation
  5. Submit to Product
- **Workflow** on every project page, with a "Next step" card that shows only the buttons the current person can use:
  draft → Product assigns an owner → owner sets man-days and target date → configuring → Tech (optional) marks deployed to beta or prod → Product QA → CST review → live.
  CST gets two review rounds; a third needs Product to approve the request. Product can pause, resume or cancel, change the owner, estimate or deadline (with a reason on the timeline), and attach Azure DevOps PBIs, files and links.
- Every hand-off, plan change, requirement edit and comment is on the project timeline, and the receiving team gets an email nudge when SMTP is set.

## Setup

### 1. Create the Neon database from Vercel

1. Sign in at [vercel.com](https://vercel.com) with the GitHub account that owns this repo.
2. **Add New > Project**, import `Pulse-client-delivery`, and click **Deploy**. The first deploy fails until steps 2 and 3 are done; that's expected.
3. In the project, open **Storage > Create Database > Neon (Serverless Postgres)**, pick the free plan and the region nearest your users (for example `aws-ap-south-1`, Mumbai), and connect it to the project for all environments.
4. Vercel now adds the connection strings (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, or the same names with the prefix you chose) to the project's environment variables. The app finds them under any of those names, so you don't need to copy them anywhere.
5. Check under **Settings > Environment Variables** that they are enabled for **Production** and **Preview**, then **Deployments > Redeploy**. A build that started before the database was connected can't see it.

Every Vercel build runs `npm run vercel-build`, which applies migrations, seeds the Pulse page catalog and clients, then builds the app. You never run migrations by hand.

### 2. Add the environment variables in Vercel

In **Settings > Environment Variables**:

| Name | Value |
| --- | --- |
| `AUTH_SECRET` | A random string: `openssl rand -base64 32` |
| `ADMIN_EMAILS` | Emails that become admins when they register, for example `ishan@flick2know.com` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Optional. Needed for "Forgot password?" emails and hand-off nudges. Brevo: `smtp-relay.brevo.com`, `587`, your SMTP login and key, and a verified sender |

Then **Deployments > Redeploy**.

### 3. Make it fast: put the app next to the database

Every page reads the database several times, so the app and the database must be in the same region. Open **Users and roles** as an admin: the line under the table shows the database round trip and both regions. If the round trip is above about 50 ms, go to Vercel **Settings > Functions > Function Region** and pick the region that matches the database (for example `bom1` Mumbai for Neon `ap-south-1`, `iad1` Washington for `us-east-1`, `sin1` Singapore for `ap-southeast-1`), then redeploy.

### 4. Load the full Pulse company list (optional)

The seed includes the 55 companies that already run a Pulse dashboard and every active KPI and chart configuration. To load every company, or refresh the catalog, run these on `Masters_GT_Replica`, save each result as CSV, and upload them as an admin on the **Clients** and **Pulse catalog** pages.

Companies:

```sql
SELECT Id, Name FROM Companies WHERE Deleted = 0 ORDER BY Id;
```

KPI and chart catalog:

```sql
SELECT 'kpi' AS kind, ConfigurationId AS configurationId, Title AS title, Description AS description,
       NULL AS chartType, OutputType AS outputType, [Database] AS [database]
FROM PulseKpiConfigurations WHERE IsActive = 1
UNION ALL
SELECT 'chart', ConfigurationId, Title, Description, ChartType, NULL, [Database]
FROM PulseChartConfigurations WHERE IsActive = 1
UNION ALL
SELECT 'dynamic_chart', ConfigurationId, Title, Description, ChartType, NULL, [Database]
FROM PulseDynamicChartConfigurations WHERE IsActive = 1
UNION ALL
SELECT 'composite_chart', ConfigurationId, Title, Description, ChartType, NULL, NULL
FROM PulseCompositeChartConfigurations WHERE IsActive = 1;
```

Re-importing is safe: existing company IDs and catalog entries are updated, not duplicated.

## Local development

```bash
cp .env.example .env        # point DATABASE_URL at a local Postgres or a Neon branch
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Without `SMTP_*` set, local development prints emails (password reset codes, nudges) in the terminal running `npm run dev`. In production, "Forgot password?" asks people to contact an admin instead.

When you change `src/db/schema.ts`, run `npm run db:generate` and commit the new file in `drizzle/`.

## Project layout

```
src/
  lib/auth.ts               sessions (cookie + user_sessions table), auth event log
  lib/auth-actions.ts       sign up, log in, log out, password reset
  lib/password.ts           scrypt password hashing
  lib/workflow.ts           who can do what at each stage, review round rules
  lib/otp.ts, lib/mailer.ts reset codes and SMTP sending
  middleware.ts             sends visitors without a session cookie to /login
  db/schema.ts              users, sessions, auth events, clients, projects, requirement, comments, links, events, catalog
  app/login, app/signup, app/forgot-password, app/onboarding
  app/(app)/                dashboard, projects (+ requirement builder), clients, catalog, admin/users
  components/               UI kit (button, card, badge, inputs), shell, project widgets
scripts/seed.ts             Pulse pages, clients that already run Pulse, and the KPI/chart catalog (pulse-catalog.json)
```

## Theme

Colors live in `src/app/globals.css` under `@theme`. `brand-*` is the Pulse blue scale and `danger-*` is the red used for warnings and delete actions. To match the exact Pulse logo blue, change `--color-brand-600` (and its neighbours) there.
