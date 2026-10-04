import type { Metadata } from "next";
import { AddMoneyReturn } from "@/components/wallet/AddMoneyReturn";

export const metadata: Metadata = { title: "Your payment", robots: { index: false } };

export default function Page() {
  return <AddMoneyReturn />;
}
