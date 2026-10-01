import type { Metadata } from "next";
import { Mail } from "lucide-react";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  return (
    <main className="mx-auto grid w-full max-w-md gap-4 px-4 pt-16 pb-10 text-center">
      <Mail aria-hidden className="mx-auto size-10 text-primary" />
      <h1 className="font-display text-[32px] leading-9 font-bold tracking-[-0.015em] text-balance">
        Check your email
      </h1>
      <p className="text-[17px] leading-[26px] text-ink-muted">
        {e
          ? `If ${e} can be used, we've sent a link to confirm it.`
          : "We've sent a link to confirm your email."}{" "}
        It works for 24 hours.
      </p>
    </main>
  );
}
