import type { Metadata } from "next";
import { Withdraw } from "@/components/wallet/Withdraw";

export const metadata: Metadata = { title: "Withdraw", robots: { index: false } };

export default function Page() {
  return <Withdraw />;
}
