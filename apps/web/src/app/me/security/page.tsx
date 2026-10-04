import type { Metadata } from "next";
import { SecurityScreen } from "@/components/security/SecurityScreen";

export const metadata: Metadata = { title: "Second lock", robots: { index: false } };

export default function SecurityPage() {
  return <SecurityScreen />;
}
