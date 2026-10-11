export const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || "flick2know.com").toLowerCase();

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
