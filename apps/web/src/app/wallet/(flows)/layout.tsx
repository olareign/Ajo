import type { ReactNode } from "react";
import { MoneyFlow } from "@/components/wallet/MoneyFlow";

export default function FlowsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <MoneyFlow>{children}</MoneyFlow>;
}
