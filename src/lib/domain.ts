// Only this work domain can sign in. Kept in code so a stale Vercel variable can never override it.
export const allowedDomain = "fieldassist.com";

export function isWorkEmail(email?: string | null) {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return e.endsWith(`@${allowedDomain}`) && e.indexOf("@") === e.lastIndexOf("@");
}

export function isSeedAdmin(email: string) {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
