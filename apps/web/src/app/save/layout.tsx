import type { ReactNode } from "react";
import { SavingsProvider } from "@/components/savings/SavingsFlow";
import { MoneyFlow } from "@/components/wallet/MoneyFlow";

export default function SaveLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MoneyFlow>
      <SavingsProvider>{children}</SavingsProvider>
    </MoneyFlow>
  );
}
