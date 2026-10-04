import type { ReactNode } from "react";
import { FriendsProvider } from "@/components/friends/FriendsFlow";
import { MoneyFlow } from "@/components/wallet/MoneyFlow";

export default function FriendsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MoneyFlow>
      <FriendsProvider>{children}</FriendsProvider>
    </MoneyFlow>
  );
}
