import type { Metadata } from "next";
import { VerifyEmail } from "@/components/auth/VerifyEmail";
import { ScreenHeader } from "@/components/ScreenHeader";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-10">
      <ScreenHeader title="Confirm your email" />
      {token ? (
        <VerifyEmail token={token} />
      ) : (
        <p role="alert">This link is incomplete. Open it again from your email.</p>
      )}
    </main>
  );
}
