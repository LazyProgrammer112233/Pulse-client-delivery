# Pulse Delivery

Internal portal for delivering Pulse web dashboards and the Pulse app to new clients. CST captures the requirement, Product owns delivery, Tech builds what configuration cannot do, and everyone follows one timeline until CST signs off.

## Stack (all on free tiers)

| Part | Choice |
| --- | --- |
| App | Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Lucide icons |
| Hosting | Vercel Hobby |
| Database | Neon Postgres free tier, through Vercel's Neon integration |
| ORM | Drizzle (migrations in `drizzle/`) |
| Sign-in | Auth.js with a one-time code emailed to `@flick2know.com` addresses (Microsoft 365 sign-in can be switched on later) |
| Email | Any SMTP sender; Brevo free tier (300 emails a day) or a Gmail app password |

## What works today (step 1)

- Email code sign-in: enter your work email, get a 6-digit code, type it in. Any email outside `@flick2know.com` is rejected on the server with "This email is not a work email". Codes expire after 10 minutes, work once, allow 5 tries, and at most 5 codes go out per email every 15 minutes.
- First sign-in asks for the team (CST, Product or Tech) and opens that team's dashboard.
- CST creates a client project: pick a Pulse company by name or company ID, or add a new client, then choose web dashboard, Pulse app or both.
- Project page with the delivery lifecycle, activity timeline, comments, and "Assign to Product".
- Admin: add, remove, deactivate users, change teams, make admins. Import the full Pulse company list and the KPI and chart catalog from CSV.

Next: the requirement builder (pages, KPIs, charts, branding, add-ons), then the full Product and Tech workflow with email nudges.

## Setup

### 1. Create the Neon database from Vercel

1. Sign in at [vercel.com](https://vercel.com) with the GitHub account that owns this repo.
2. **Add New > Project**, import `Pulse-client-delivery`, and click **Deploy**. The first deploy fails until steps 2 and 3 are done; that's expected.
3. In the project, open **Storage > Create Database > Neon (Serverless Postgres)**, pick the free plan and the region nearest your users (for example `aws-ap-south-1`, Mumbai), and connect it to the project for all environments.
4. Vercel now adds the connection strings (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, or the same names with the prefix you chose) to the project's environment variables. The app finds them under any of those names, so you don't need to copy them anywhere.
5. Check under **Settings > Environment Variables** that they are enabled for **Production** and **Preview**, then **Deployments > Redeploy**. A build that started before the database was connected can't see it.

Every Vercel build runs `npm run vercel-build`, which applies migrations, seeds the Pulse page catalog and clients, then builds the app. You never run migrations by hand.

### 2. Set up email for sign-in codes (free)

Sign-in codes go out over SMTP. Either of these is free and needs no DNS or IT admin changes.

**Brevo (recommended, 300 emails a day)**

1. Create a free account at [brevo.com](https://www.brevo.com).
2. **Senders, Domains & Dedicated IPs > Senders > Add a sender** with the address the codes should come from (your own work mailbox is fine). Brevo emails that address a confirmation link; click it.
3. **SMTP & API > SMTP** shows the server `smtp-relay.brevo.com`, port `587`, and your SMTP login. Click **Generate a new SMTP key** and copy it.

**Gmail (alternative, 500 emails a day)**

1. On a Google account with 2-Step Verification on, open [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) and create an app password.
2. Use `smtp.gmail.com`, port `587`, the Gmail address as the user and the app password as the password.

Codes sent from an address that isn't on a verified domain can land in spam the first time. Ask people to mark the first email "Not spam".

### 3. Add the environment variables in Vercel

In **Settings > Environment Variables**, add:

| Name | Value |
| --- | --- |
| `AUTH_SECRET` | A random string. Run `openssl rand -base64 32` or `npx auth secret` |
| `SMTP_HOST` | `smtp-relay.brevo.com` (or `smtp.gmail.com`) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Brevo SMTP login (or the Gmail address) |
| `SMTP_PASS` | Brevo SMTP key (or the Gmail app password) |
| `EMAIL_FROM` | `Pulse Delivery <the-sender-you-verified@...>` |
| `ALLOWED_EMAIL_DOMAIN` | `flick2know.com` |
| `ADMIN_EMAILS` | Comma-separated emails that become admins on first sign-in, for example `ishan@flick2know.com` |

Then **Deployments > Redeploy**. Open the site, enter your work email, and sign in with the code.

### Later: Microsoft 365 sign-in (optional)

Once an IT admin can register an app in Microsoft Entra ID, a "Sign in with Microsoft" button appears next to the email code as soon as these three variables are set:

1. [portal.azure.com](https://portal.azure.com) > **Microsoft Entra ID > App registrations > New registration**, name `Pulse Delivery`, **Accounts in this organizational directory only**.
2. Redirect URI (Web): `https://<your-vercel-domain>/api/auth/callback/microsoft-entra-id`.
3. Create a client secret under **Certificates & secrets**.
4. Set `AUTH_MICROSOFT_ENTRA_ID_ID` (Application ID), `AUTH_MICROSOFT_ENTRA_ID_SECRET` (secret value) and `AUTH_MICROSOFT_ENTRA_ID_ISSUER` (`https://login.microsoftonline.com/<tenant-id>/v2.0`), then redeploy.

### 4. Load the full Pulse company list and catalog

The seed only includes the 55 companies that already run a Pulse dashboard. To load every company and the full KPI and chart catalog, run these on `Masters_GT_Replica`, save each result as CSV, and upload them as an admin on the **Clients** and **Pulse catalog** pages.

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

Without `SMTP_*` set, local development prints each sign-in code in the terminal running `npm run dev` instead of emailing it. Production refuses to start a sign-in without SMTP.

When you change `src/db/schema.ts`, run `npm run db:generate` and commit the new file in `drizzle/`.

## Project layout

```
src/
  auth.ts, auth.config.ts   sign-in, domain check, user upsert
  lib/otp.ts, lib/mailer.ts one-time email codes and SMTP sending
  middleware.ts             sends signed-out visitors to /login
  db/schema.ts              users, clients, projects, requirement items, comments, links, events, catalog
  app/login, app/onboarding first sign-in flow
  app/(app)/                dashboard, projects, clients, catalog, admin/users
  components/               UI kit (button, card, badge, inputs), shell, project widgets
scripts/seed.ts             Pulse pages and clients that already run Pulse
```

## Theme

Colors live in `src/app/globals.css` under `@theme`. `brand-*` is the Pulse blue scale and `danger-*` is the red used for warnings and delete actions. To match the exact Pulse logo blue, change `--color-brand-600` (and its neighbours) there.
