import type { Metadata } from "next";
import { PinScreen } from "@/components/security/PinScreen";

export const metadata: Metadata = { title: "Transaction PIN", robots: { index: false } };

export default function Page() {
  return <PinScreen />;
}
