import type { Metadata } from "next";
import { BankAccounts } from "@/components/wallet/BankAccounts";

export const metadata: Metadata = { title: "Bank accounts", robots: { index: false } };

export default function Page() {
  return <BankAccounts />;
}
