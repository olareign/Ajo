import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { MfaForm } from "@/components/auth/MfaForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { loadServerEnv } from "@/server/env";
import { mfaCookie, openSeal, type MfaChallenge } from "@/server/session";

export const metadata: Metadata = { title: "Verify it's you", robots: { index: false } };

export default async function VerifyPage() {
  const env = loadServerEnv(process.env);
  const cookie = mfaCookie(env.production);
  const challenge = await openSeal<MfaChallenge>(
    (await cookies()).get(cookie.name)?.value,
    env.sessionSecret,
  );
  // Without a sign-in waiting for its second step there is nothing to verify.
  if (!challenge) redirect("/sign-in");

  return (
    <AuthScreen>
      <ScreenHeader
        backHref="/sign-in"
        title="Verify it's you"
        subtitle="Enter the 6-digit code from your authenticator app."
      />
      <MfaForm />
    </AuthScreen>
  );
}
