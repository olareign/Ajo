import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import type { Me } from "@/components/onboarding/MeGate";
import { ButtonLink } from "@/components/ui/ButtonLink";

type Props = Readonly<{ me: Me; children: ReactNode }>;

/**
 * Saving, joining and creating circles, and adding friends, are closed until the passport is
 * approved. Wrap their screens in this; the API refuses the same actions on its own side.
 */
export function KycGate({ me, children }: Props) {
  if (me.kycStatus === "approved") return <>{children}</>;
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-10 pb-28">
      <div className="grid justify-items-center gap-4 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift">
        <Lock aria-hidden className="size-10 text-primary" />
        <h1 className="font-display text-[24px] leading-8 font-semibold">
          Finish your passport first
        </h1>
        <p className="text-[15px] leading-6 text-ink-muted">
          {me.kycStatus === "pending"
            ? "We're checking your details. This opens as soon as they're approved."
            : "Saving, joining circles and adding friends open once your identity is verified."}
        </p>
        <ButtonLink href="/verify">Go to my passport</ButtonLink>
      </div>
    </main>
  );
}
