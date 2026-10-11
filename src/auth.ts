import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";
import { db, schema } from "./db";
import { isWorkEmail, isSeedAdmin } from "./lib/domain";
import { verifyCode } from "./lib/otp";

export const isMicrosoftConfigured = !!(
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
);

const providers: Provider[] = [
  // Primary sign-in: a 6-digit code emailed to a @flick2know.com address
  Credentials({
    id: "email-otp",
    name: "Email code",
    credentials: { email: { label: "Email" }, code: { label: "Code" } },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const code = String(credentials?.code ?? "").trim();
      if (!isWorkEmail(email)) return null;
      if (!(await verifyCode(email, code))) return null;
      return { id: email, email };
    },
  }),
];

// Microsoft 365 sign-in stays available and switches on once its app registration is configured
if (isMicrosoftConfigured) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  );
}

/** Pick the most reliable email from a Microsoft profile (work accounts may only carry a UPN). */
function emailFrom(user: { email?: string | null }, profile?: Record<string, unknown> | null) {
  const candidate =
    (profile?.email as string | undefined) ||
    (profile?.preferred_username as string | undefined) ||
    (profile?.upn as string | undefined) ||
    user.email ||
    "";
  return candidate.trim().toLowerCase();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, profile }) {
      const email = emailFrom(user, profile);
      if (!isWorkEmail(email)) return "/login?error=not_work_email";

      const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      if (existing && !existing.active) return "/login?error=deactivated";

      if (existing) {
        await db
          .update(schema.users)
          .set({
            lastLoginAt: new Date(),
            name: existing.name ?? user.name ?? null,
            isAdmin: existing.isAdmin || isSeedAdmin(email),
          })
          .where(eq(schema.users.id, existing.id));
      } else {
        await db.insert(schema.users).values({
          email,
          name: user.name ?? null,
          isAdmin: isSeedAdmin(email),
          lastLoginAt: new Date(),
        });
      }
      user.email = email;
      return true;
    },
    async jwt({ token, user, profile }) {
      if (user) token.email = emailFrom(user, profile as Record<string, unknown> | undefined);
      return token;
    },
    async session({ session, token }) {
      if (token.email && session.user) session.user.email = token.email as string;
      return session;
    },
  },
});

