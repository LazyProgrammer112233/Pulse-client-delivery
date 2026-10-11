"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { isWorkEmail } from "@/lib/domain";
import { issueCode } from "@/lib/otp";

const codeStep = (email: string, error?: string) =>
  `/login?step=code&email=${encodeURIComponent(email)}${error ? `&error=${error}` : ""}`;

export async function requestCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isWorkEmail(email)) redirect(`/login?error=not_work_email&email=${encodeURIComponent(email)}`);

  let result: { error?: string };
  try {
    result = await issueCode(email);
  } catch (e) {
    console.error("Sending sign-in code failed", e);
    redirect(`/login?error=send_failed&email=${encodeURIComponent(email)}`);
  }
  if (result.error) redirect(`/login?error=rate_limited&email=${encodeURIComponent(email)}`);
  redirect(codeStep(email));
}

export async function verifyLoginCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!isWorkEmail(email)) redirect("/login?error=not_work_email");
  try {
    await signIn("email-otp", { email, code, redirectTo: "/dashboard" });
  } catch (e) {
    // signIn signals success with a redirect, which must be re-thrown
    if (e instanceof AuthError) {
      redirect(e.type === "AccessDenied" ? "/login?error=deactivated" : codeStep(email, "invalid_code"));
    }
    throw e;
  }
}
