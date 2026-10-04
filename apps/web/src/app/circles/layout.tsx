import type { ReactNode } from "react";
import { CirclesProvider } from "@/components/circles/CirclesFlow";
import { MoneyFlow } from "@/components/wallet/MoneyFlow";

export default function CirclesLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MoneyFlow>
      <CirclesProvider>{children}</CirclesProvider>
    </MoneyFlow>
  );
}
