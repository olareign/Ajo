"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { liveGateway, previewGateway, type SavingsGateway } from "@/lib/savings-gateway";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";

const Context = createContext<SavingsGateway | null>(null);

/**
 * What the saving screens talk to: the server, or in a preview a pretend one that lives only in this
 * tab. It sits in the layout, so a preview plan made on one screen is still there on the next.
 */
export function SavingsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { preview, currency } = useMoneyFlow();
  const gateway = useMemo(
    () => (preview ? previewGateway(currency) : liveGateway),
    [preview, currency],
  );
  return <Context.Provider value={gateway}>{children}</Context.Provider>;
}

export function useSavings(): SavingsGateway {
  const value = useContext(Context);
  if (!value) throw new Error("useSavings must be used inside <SavingsProvider>");
  return value;
}

/** Saving needs verified identity (not a payment partner), so a preview is the only way in before that. */
export function useSavingsLock(): "kyc" | null {
  const { preview, rails } = useMoneyFlow();
  return !preview && !rails.kycApproved ? "kyc" : null;
}
