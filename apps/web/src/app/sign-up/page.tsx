import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { loadServerEnv } from "@/server/env";

export const metadata: Metadata = { title: "Create account" };

// Read per request: the site key is a setting, not something to bake in at build time.
export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ invite?: string | string[] }> }>) {
  const { turnstileSiteKey } = loadServerEnv(process.env);
  const { invite } = await searchParams;
  // Only the shape an invite code has; anything else is dropped here, not sent on.
  const code = typeof invite === "string" && /^[A-Za-z0-9]{8}$/.test(invite) ? invite : undefined;
  return (
    <AuthScreen
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <ScreenHeader
        backHref="/"
        title="Let's get you started"
        subtitle="Create your Àjọ account. It takes a minute."
      />
      <SignUpForm turnstileSiteKey={turnstileSiteKey} invite={code} />
    </AuthScreen>
  );
}
