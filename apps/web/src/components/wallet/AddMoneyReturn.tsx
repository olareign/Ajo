"use client";

import { Hourglass } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { usePayment } from "@/lib/use-payment";
import { useMoneyFlow } from "./MoneyFlow";

/**
 * Where the payment partner sends the person back to. It only watches: the payment is settled by
 * the partner's own message to our server, so this never says "paid" on the strength of the address
 * the person arrived by.
 */
export function AddMoneyReturn() {
  const router = useRouter();
  const { href, locale } = useMoneyFlow();
  const id = useSearchParams().get("id");
  const { payment, failure, gaveUp } = usePayment(id);

  useEffect(() => {
    if (failure?.kind === "signed-out") router.replace("/sign-in");
  }, [failure, router]);

  const wallet = (
    <ButtonLink href={href("/wallet")} size="lg" block>
      Back to my wallet
    </ButtonLink>
  );

  if (!id || (failure && failure.kind !== "signed-out" && failure.kind !== "unreachable")) {
    return (
      <Shell title="We couldn't find that payment">
        <p className="text-ink-muted">
          {failure?.kind === "refused"
            ? failure.message
            : "Open your wallet to see where your money is."}
        </p>
        {wallet}
      </Shell>
    );
  }

  if (payment?.status === "succeeded") {
    return (
      <Shell title="Money added">
        <Amount
          amount={payment.amount.amount}
          currency={payment.amount.currency as "NGN" | "GBP"}
          locale={locale}
          size="xl"
        />
        <p className="text-ink-muted">It&apos;s in your wallet now.</p>
        {wallet}
      </Shell>
    );
  }

  if (payment?.status === "failed" || payment?.status === "reversed") {
    return (
      <Shell title="That payment didn't go through">
        <p role="alert" className="text-ink-muted">
          {payment.failureReason ?? "Your bank or card didn't accept it."} You haven&apos;t been
          charged.
        </p>
        <ButtonLink href={href("/wallet/add")} size="lg" block>
          Try again
        </ButtonLink>
        <ButtonLink href={href("/wallet")} variant="quiet" size="lg" block>
          Back to my wallet
        </ButtonLink>
      </Shell>
    );
  }

  if (gaveUp) {
    return (
      <Shell title="Still waiting for your bank">
        <p className="text-ink-muted">
          It hasn&apos;t confirmed yet. If you paid, it will show in your wallet by itself, so
          there&apos;s no need to pay again.
        </p>
        {wallet}
      </Shell>
    );
  }

  return (
    <Shell title="Checking your payment">
      <p role="status" className="flex items-center gap-2 text-ink-muted">
        <Hourglass aria-hidden className="size-4" />
        Waiting for your bank to confirm. This page updates by itself.
      </p>
    </Shell>
  );
}

function Shell({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader title={title} backHref="/wallet" />
      <div className="grid justify-items-center gap-6 pt-4 text-center">{children}</div>
    </main>
  );
}
