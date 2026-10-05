import type { Metadata } from "next";
import { ActivityScreen } from "@/components/security/ActivityScreen";

export const metadata: Metadata = { title: "Security activity", robots: { index: false } };

export default function Page() {
  return <ActivityScreen />;
}
