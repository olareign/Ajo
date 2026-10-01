import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { ScreenHeader } from "@/components/ScreenHeader";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthScreen>
      <ScreenHeader
        backHref="/sign-in"
        title="Choose a new password"
        subtitle="Pick something only you would think of. You'll be signed out everywhere else."
      />
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="grid justify-items-start gap-4">
          <p role="alert" className="text-[17px] leading-[26px] text-ink-muted">
            This link is incomplete. Open it again from your email, or ask for a new one.
          </p>
          <Link
            href="/forgot-password"
            className="text-[15px] font-semibold text-adire underline-offset-4 hover:underline"
          >
            Ask for a new link
          </Link>
        </div>
      )}
    </AuthScreen>
  );
}
