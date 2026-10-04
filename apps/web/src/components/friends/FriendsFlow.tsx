"use client";

import { BadgeCheck } from "lucide-react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import { cn } from "@/lib/cn";
import { liveFriends, previewFriends, type FriendsGateway } from "@/lib/friends-gateway";

const Context = createContext<FriendsGateway | null>(null);

/** What the friends screens talk to: the server, or in a preview a pretend one that lives in this tab. */
export function FriendsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { preview } = useMoneyFlow();
  const gateway = useMemo(() => (preview ? previewFriends() : liveFriends), [preview]);
  return <Context.Provider value={gateway}>{children}</Context.Provider>;
}

export function useFriends(): FriendsGateway {
  const value = useContext(Context);
  if (!value) throw new Error("useFriends must be used inside <FriendsProvider>");
  return value;
}

/** Friends need verified identity, so a preview is the only way in before that. */
export function useFriendsLock(): "kyc" | null {
  const { preview, rails } = useMoneyFlow();
  return !preview && !rails.kycApproved ? "kyc" : null;
}

/** "Verified" for everyone who can be found; "Verified +" for those who also added a national check. */
export function TierBadge({ tier }: Readonly<{ tier: 1 | 2 }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
        tier === 2 ? "bg-oro-tint text-oro-ink" : "bg-leaf-tint text-leaf",
      )}
    >
      <BadgeCheck aria-hidden className="size-3.5" />
      {tier === 2 ? "Verified +" : "Verified"}
    </span>
  );
}
