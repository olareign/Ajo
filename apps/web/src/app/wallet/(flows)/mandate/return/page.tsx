import type { Metadata } from "next";
import { Mandate } from "@/components/wallet/Mandate";

export const metadata: Metadata = { title: "Auto-debit", robots: { index: false } };

// The partner sends the person back here. The same screen asks the API where things stand and keeps
// asking until the bank has answered, so there is nothing separate to build.
export default function Page() {
  return <Mandate />;
}
