import type { Metadata } from "next";
import { Mandate } from "@/components/wallet/Mandate";

export const metadata: Metadata = { title: "Auto-debit", robots: { index: false } };

export default function Page() {
  return <Mandate />;
}
