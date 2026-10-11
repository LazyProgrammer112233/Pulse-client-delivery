import type { NextAuthConfig } from "next-auth";

// Edge-safe part of the auth config, shared with middleware (no database access here)
export const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isPublic = path.startsWith("/login") || path.startsWith("/api/auth");
      if (isPublic) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
