import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendMail } from "./mailer";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_15_MIN = 5;

function hash(email: string, code: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev-secret").update(`${email}:${code}`).digest("hex");
}

/** Creates and emails a 6-digit password reset code. Returns an error message when rate-limited. */
export async function issueCode(email: string): Promise<{ error?: string }> {
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(schema.loginCodes)
    .where(and(eq(schema.loginCodes.email, email), gt(schema.loginCodes.createdAt, sql`now() - interval '15 minutes'`)));
  if (recent >= MAX_CODES_PER_15_MIN) return { error: "Too many codes requested. Wait 15 minutes and try again." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(schema.loginCodes).values({
    email,
    codeHash: hash(email, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
  });

  await sendMail({
    to: email,
    subject: `${code} is your Pulse Delivery password reset code`,
    text: `Your Pulse Delivery password reset code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.\n\nIf you didn't ask for it, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;color:#0f1b33;max-width:420px">
      <p style="font-size:15px">Your Pulse Delivery password reset code is</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#1e56d9;margin:8px 0 16px">${code}</p>
      <p style="font-size:13px;color:#5b6b86">It expires in ${CODE_TTL_MINUTES} minutes. If you didn't ask for it, ignore this email.</p>
    </div>`,
  });
  return {};
}

/** Checks the newest unused code for the email. Consumes it on success, counts the attempt on failure. */
export async function verifyCode(email: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const [row] = await db
    .select()
    .from(schema.loginCodes)
    .where(
      and(
        eq(schema.loginCodes.email, email),
        isNull(schema.loginCodes.consumedAt),
        gt(schema.loginCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(schema.loginCodes.createdAt))
    .limit(1);
  if (!row || row.attempts >= MAX_ATTEMPTS) return false;

  const expected = Buffer.from(row.codeHash, "hex");
  const actual = Buffer.from(hash(email, code), "hex");
  const ok = expected.length === actual.length && timingSafeEqual(expected, actual);

  await db
    .update(schema.loginCodes)
    .set(ok ? { consumedAt: new Date() } : { attempts: row.attempts + 1 })
    .where(eq(schema.loginCodes.id, row.id));
  return ok;
}
