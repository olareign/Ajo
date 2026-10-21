import { Suspense, type ReactNode } from "react";
import { WalletShell } from "@/components/wallet/WalletShell";

export default function WalletLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense>
      <WalletShell>{children}</WalletShell>
    </Suspense>
  );
}
