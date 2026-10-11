/**
 * Seeds the Pulse page catalog and the companies that already run a Pulse dashboard.
 * Safe to run more than once. Data read from Masters_GT_Replica on 2026-10-11.
 *   npm run db:seed
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import catalog from "./pulse-catalog.json";

type CatalogRow = {
  kind: "kpi" | "chart" | "dynamic_chart" | "composite_chart";
  configurationId: string;
  title: string;
  description: string | null;
  chartType: string | null;
  outputType: string | null;
};

const PAGES = [
  { key: "control-tower-homepage", name: "Homepage", usedBy: 56, defaultTabs: ["Daily", "Monthly", "Quarterly", "Yearly"], description: "Overview of key metrics across all dimensions" },
  { key: "control-tower-discipline", name: "Discipline", usedBy: 55, defaultTabs: ["Daily", "Monthly", "Quarterly", "Live Map"], description: "Field force productivity, PJP adherence and call effectiveness" },
  { key: "control-tower-sales", name: "Sales", usedBy: 55, defaultTabs: ["Daily", "Monthly", "Quarterly"], description: "Primary and secondary sales and returns" },
  { key: "control-tower-coverage", name: "Coverage", usedBy: 54, defaultTabs: ["Daily", "Monthly", "Quarterly", "Heat Map"], description: "Outlet coverage and KPI heat map by geography" },
  { key: "control-tower-distributor", name: "Distributor", usedBy: 53, defaultTabs: ["Daily", "Monthly", "Quarterly"], description: "Distributor sales, coverage and performance" },
  { key: "control-tower-modern-trade", name: "Modern Trade", usedBy: 27, defaultTabs: ["Daily", "Monthly", "Quarterly"], description: "Modern trade channels, retail partnerships and organised retail" },
  { key: "control-tower-van-sales", name: "Van Sales", usedBy: 27, defaultTabs: ["Daily", "Monthly", "Quarterly"], description: "Van sales operations, routes and mobile sales performance" },
  { key: "control-tower-outlet", name: "Outlet", usedBy: 10, defaultTabs: ["Daily", "Monthly", "Quarterly"], description: "Outlet-level performance" },
  { key: "control-tower-beat", name: "Beat", usedBy: 10, defaultTabs: ["Daily", "Monthly", "Quarterly"], description: "Beat and route performance" },
  { key: "control-tower-iris", name: "IRIS (image recognition)", usedBy: 10, defaultTabs: ["Daily", "Monthly", "Quarterly"], description: "Image recognition: shelf, cooler purity and planogram KPIs" },
  { key: "control-tower-perfect-store", name: "Perfect Store", usedBy: 4, defaultTabs: ["Daily", "Monthly"], description: "Perfect store scoring" },
  { key: "control-tower-product-recommendation", name: "PR Impact", usedBy: 5, defaultTabs: ["Daily"], description: "Product recommendation impact" },
  { key: "control-tower-scheme", name: "Scheme Analysis", usedBy: 1, defaultTabs: ["Monthly"], description: "Trade scheme performance" },
];

// Companies with an active Pulse Control Tower configuration (PulseControlTowerConfigurations)
const PULSE_CLIENTS: [number, string][] = [
  [10177, "Everest Spices"], [10350, "Laksven T"], [10600, "Deoleo"], [11156, "Dairy"], [11337, "Lotte India_Live"],
  [11417, "Signify"], [11464, "Intergrow Brands_Live"], [11651, "Premier Foods Limited"], [162257, "GIL Live"],
  [172305, "SAR GROUP"], [193004, "Ullas Agarbathi"], [193014, "NIPPO"], [193017, "HCCB UAT"], [193038, "Good Drop Wines"],
  [193054, "HCCB Prod"], [203226, "Darshan Incense"], [213395, "Riva"], [223654, "3M Cleaning & Safety"],
  [233693, "Gethucon"], [233709, "Admu SMC Investment"], [233710, "Jribo Holdings- Kampala"],
  [233731, "United Breweries Pilot Go Live"], [233784, "Nyanza Trading Company"], [233788, "Tess Enterprises"],
  [233794, "Mars Auto Spares & Hardware Limited."], [233821, "HPPL Prod"], [233872, "Medyak Company Limited"],
  [234079, "Comptoir General Du Sud Coges"], [234089, "AJ Test"], [234279, "United Breweries Go Live"],
  [234304, "24 Mantra Organic"], [234474, "Mars Wrigley Vietnam GT"], [234483, "Mars Wrigley MT"],
  [244572, "Capital Auto Tune Limited"], [244574, "Viral Oil Limited"], [244575, "Kcreelyn Agencies Fortportal"],
  [244576, "Danjeys Enterprises - Gulu"], [244577, "Grabetine Investments Ltd"], [244596, "Kcreelyn Agencies Masaka"],
  [244603, "Alaro SMC - Arua"], [244632, "Sri Srinivasa UAT (Scoops)"], [244636, "SN SAD"],
  [244640, "Coumba Service Trading"], [244642, "ABC Marketing Ltd"], [244643, "Eroyen Marketing Ltd"],
  [244664, "Chopinhos"], [244669, "Zorgati Sousse"], [244691, "Jribo Holdings - Lira"], [244692, "Jribo Holdings - Mbale"],
  [244696, "Hell Energy"], [244715, "Jomaa"], [254783, "Bongchie New"], [254806, "S-LUB"], [254852, "PARAG ONE - LIVE"],
  [264938, "L'Oreal MT"],
];

async function main() {
  await db
    .insert(schema.catalogPages)
    .values(PAGES)
    .onConflictDoUpdate({
      target: schema.catalogPages.key,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        defaultTabs: sql`excluded.default_tabs`,
        usedBy: sql`excluded.used_by`,
      },
    });

  await db
    .insert(schema.clients)
    .values(PULSE_CLIENTS.map(([companyId, name]) => ({ companyId, name, source: "pulse" as const })))
    .onConflictDoNothing({ target: schema.clients.companyId });

  // Active KPI and chart configurations from Masters_GT_Replica; an admin CSV import refreshes them later
  const rows = catalog as CatalogRow[];
  for (let i = 0; i < rows.length; i += 400) {
    await db
      .insert(schema.catalogItems)
      .values(rows.slice(i, i + 400))
      .onConflictDoNothing({ target: [schema.catalogItems.kind, schema.catalogItems.configurationId] });
  }

  console.log(`Seeded ${PAGES.length} pages, ${PULSE_CLIENTS.length} Pulse clients and ${rows.length} catalog items.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
