import "server-only";
import nodemailer from "nodemailer";

const configured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export const isMailConfigured = configured;

const transport = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  if (!transport) {
    if (process.env.NODE_ENV === "production") throw new Error("Email is not configured: set SMTP_HOST, SMTP_USER and SMTP_PASS.");
    // Local development without SMTP: print the email instead of sending it
    console.log(`\n[mail] to=${to} subject="${subject}"\n${text}\n`);
    return;
  }
  await transport.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
}
