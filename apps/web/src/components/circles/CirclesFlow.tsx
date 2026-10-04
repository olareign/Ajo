"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import { liveGroups, previewGroups, type GroupsGateway } from "@/lib/groups-gateway";

const Context = createContext<GroupsGateway | null>(null);

/**
 * What the circle screens talk to: the server, or in a preview a pretend one that lives in this tab.
 * It sits in the layout, so a preview circle made on one screen is still there on the next.
 */
export function CirclesProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { preview, currency, me } = useMoneyFlow();
  const gateway = useMemo(
    () => (preview ? previewGroups(currency, me.displayName) : liveGroups),
    [preview, currency, me.displayName],
  );
  return <Context.Provider value={gateway}>{children}</Context.Provider>;
}

export function useCircles(): GroupsGateway {
  const value = useContext(Context);
  if (!value) throw new Error("useCircles must be used inside <CirclesProvider>");
  return value;
}

/** Circles need verified identity, so a preview is the only way in before that. */
export function useCirclesLock(): "kyc" | null {
  const { preview, rails } = useMoneyFlow();
  return !preview && !rails.kycApproved ? "kyc" : null;
}

export { TrustBadge } from "@/components/ui/TrustBadge";

export const TURN_WORD = (n: number) => `turn ${n}`;
export const ORDER_WORDS = {
  join_order: "In the order people join",
  random: "A draw anyone can check",
  pick: "Everyone picks their turn",
} as const;
export const FREQ_WORDS = {
  weekly: "every week",
  biweekly: "every two weeks",
  monthly: "every month",
} as const;
