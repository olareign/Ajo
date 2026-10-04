import { Coins, Lock } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ButtonLink } from "@/components/ui/ButtonLink";
import type { Lock as LockKind } from "./MoneyFlow";

type Props = Readonly<{
  lock: Exclude<LockKind, null>;
  title: string;
  /** This screen's own address, so "preview" comes back to it. */
  path: string;
}>;

/** What a person sees where money would move, when it cannot yet: why, and how to look around anyway. */
export function FlowLocked({ lock, title, path }: Props) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader title={title} backHref="/wallet" />
      <div className="grid justify-items-center gap-5 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift">
        <span className="grid size-20 place-items-center rounded-full bg-oro-tint text-oro-ink">
          {lock === "soon" ? (
            <Coins aria-hidden className="size-10" />
          ) : (
            <Lock aria-hidden className="size-10" />
          )}
        </span>
        {lock === "soon" ? (
          <>
            <p className="font-display text-[22px] leading-7 font-semibold">Not switched on yet</p>
            <p className="text-[15px] leading-6 text-ink-muted">
              We&apos;re connecting our payment partner. This opens as soon as that&apos;s done, and
              no money has moved.
            </p>
            <ButtonLink href={`${path}?preview=1`} variant="quiet">
              Preview the flow
            </ButtonLink>
          </>
        ) : (
          <>
            <p className="font-display text-[22px] leading-7 font-semibold">
              Finish your passport first
            </p>
            <p className="text-[15px] leading-6 text-ink-muted">
              Money only moves once your identity is verified. It takes about five minutes.
            </p>
            <ButtonLink href="/verify">Go to my passport</ButtonLink>
            <ButtonLink href={`${path}?preview=1`} variant="quiet">
              Preview the flow
            </ButtonLink>
          </>
        )}
      </div>
    </main>
  );
}
